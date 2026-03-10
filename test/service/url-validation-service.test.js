'use strict';

import { expect } from 'chai';
import dns from 'dns';
import UrlValidationService from '../../service/url-validation-service.js';

describe('UrlValidationService', function () {

    // ─── _expandIPv6 ──────────────────────────────────────────────────

    describe('_expandIPv6', function () {
        it('should expand :: at the start', function () {
            expect(UrlValidationService._expandIPv6('::1'))
                .to.equal('0000:0000:0000:0000:0000:0000:0000:0001');
        });

        it('should expand :: in the middle', function () {
            expect(UrlValidationService._expandIPv6('fe80::1'))
                .to.equal('fe80:0000:0000:0000:0000:0000:0000:0001');
        });

        it('should expand :: at the end', function () {
            expect(UrlValidationService._expandIPv6('fe80::'))
                .to.equal('fe80:0000:0000:0000:0000:0000:0000:0000');
        });

        it('should expand :: representing all zeros', function () {
            expect(UrlValidationService._expandIPv6('::'))
                .to.equal('0000:0000:0000:0000:0000:0000:0000:0000');
        });

        it('should pad short groups in a full address', function () {
            expect(UrlValidationService._expandIPv6('1:2:3:4:5:6:7:8'))
                .to.equal('0001:0002:0003:0004:0005:0006:0007:0008');
        });

        it('should leave a fully-expanded address unchanged', function () {
            const full = '2001:0db8:0000:0000:0000:0000:0000:0001';
            expect(UrlValidationService._expandIPv6(full)).to.equal(full);
        });

        it('should expand :: with groups on both sides', function () {
            expect(UrlValidationService._expandIPv6('2001:db8::ff00:42:8329'))
                .to.equal('2001:0db8:0000:0000:0000:ff00:0042:8329');
        });
    });

    // ─── _ipv4ToInt ───────────────────────────────────────────────────

    describe('_ipv4ToInt', function () {
        it('should convert 0.0.0.0 to 0', function () {
            expect(UrlValidationService._ipv4ToInt('0.0.0.0')).to.equal(0);
        });

        it('should convert 255.255.255.255 to 0xFFFFFFFF', function () {
            expect(UrlValidationService._ipv4ToInt('255.255.255.255')).to.equal(0xFFFFFFFF);
        });

        it('should convert 127.0.0.1 correctly', function () {
            expect(UrlValidationService._ipv4ToInt('127.0.0.1')).to.equal(0x7F000001);
        });

        it('should convert 192.168.1.1 correctly', function () {
            expect(UrlValidationService._ipv4ToInt('192.168.1.1')).to.equal(0xC0A80101);
        });

        it('should convert 10.0.0.0 correctly', function () {
            expect(UrlValidationService._ipv4ToInt('10.0.0.0')).to.equal(0x0A000000);
        });

        it('should convert 1.0.0.0 correctly', function () {
            expect(UrlValidationService._ipv4ToInt('1.0.0.0')).to.equal(0x01000000);
        });
    });

    // ─── _ipv6ToBytes ─────────────────────────────────────────────────

    describe('_ipv6ToBytes', function () {
        it('should convert ::1 to a 16-byte array with 1 in the last byte', function () {
            const bytes = UrlValidationService._ipv6ToBytes('::1');
            expect(bytes).to.have.lengthOf(16);
            for (let i = 0; i < 15; i++) {
                expect(bytes[i]).to.equal(0);
            }
            expect(bytes[15]).to.equal(1);
        });

        it('should convert a full address correctly', function () {
            const bytes = UrlValidationService._ipv6ToBytes('2001:0db8:0000:0000:0000:0000:0000:0001');
            expect(bytes[0]).to.equal(0x20);
            expect(bytes[1]).to.equal(0x01);
            expect(bytes[2]).to.equal(0x0d);
            expect(bytes[3]).to.equal(0xb8);
            expect(bytes[15]).to.equal(0x01);
        });

        it('should convert fe80::1 correctly', function () {
            const bytes = UrlValidationService._ipv6ToBytes('fe80::1');
            expect(bytes[0]).to.equal(0xfe);
            expect(bytes[1]).to.equal(0x80);
            expect(bytes[15]).to.equal(1);
            for (let i = 2; i < 15; i++) {
                expect(bytes[i]).to.equal(0);
            }
        });
    });

    // ─── _matchesCIDRv4 ──────────────────────────────────────────────

    describe('_matchesCIDRv4', function () {
        it('should match address in /8 range', function () {
            expect(UrlValidationService._matchesCIDRv4('10.255.255.255', '10.0.0.0', 8)).to.be.true;
        });

        it('should not match address outside /8 range', function () {
            expect(UrlValidationService._matchesCIDRv4('11.0.0.1', '10.0.0.0', 8)).to.be.false;
        });

        it('should match address in /16 range', function () {
            expect(UrlValidationService._matchesCIDRv4('192.168.255.1', '192.168.0.0', 16)).to.be.true;
        });

        it('should not match address outside /16 range', function () {
            expect(UrlValidationService._matchesCIDRv4('192.169.0.1', '192.168.0.0', 16)).to.be.false;
        });

        it('should match address in /12 range', function () {
            expect(UrlValidationService._matchesCIDRv4('172.31.255.255', '172.16.0.0', 12)).to.be.true;
        });

        it('should not match address outside /12 range', function () {
            expect(UrlValidationService._matchesCIDRv4('172.32.0.0', '172.16.0.0', 12)).to.be.false;
        });

        it('should match address in /32 range (exact match)', function () {
            expect(UrlValidationService._matchesCIDRv4('1.2.3.4', '1.2.3.4', 32)).to.be.true;
        });

        it('should not match different address in /32 range', function () {
            expect(UrlValidationService._matchesCIDRv4('1.2.3.5', '1.2.3.4', 32)).to.be.false;
        });

        it('should match any address in /0 range', function () {
            expect(UrlValidationService._matchesCIDRv4('123.45.67.89', '0.0.0.0', 0)).to.be.true;
        });

        it('should match address at lower boundary of /24', function () {
            expect(UrlValidationService._matchesCIDRv4('10.0.1.0', '10.0.1.0', 24)).to.be.true;
        });

        it('should match address at upper boundary of /24', function () {
            expect(UrlValidationService._matchesCIDRv4('10.0.1.255', '10.0.1.0', 24)).to.be.true;
        });

        it('should not match address just outside /24 boundary', function () {
            expect(UrlValidationService._matchesCIDRv4('10.0.2.0', '10.0.1.0', 24)).to.be.false;
        });
    });

    // ─── _matchesCIDRv6 ──────────────────────────────────────────────

    describe('_matchesCIDRv6', function () {
        it('should match ::1 against ::1/128', function () {
            expect(UrlValidationService._matchesCIDRv6('::1', '::1', 128)).to.be.true;
        });

        it('should not match ::2 against ::1/128', function () {
            expect(UrlValidationService._matchesCIDRv6('::2', '::1', 128)).to.be.false;
        });

        it('should match address in fc00::/7 range', function () {
            expect(UrlValidationService._matchesCIDRv6('fd12:3456:789a::1', 'fc00::', 7)).to.be.true;
        });

        it('should not match address outside fc00::/7 range', function () {
            expect(UrlValidationService._matchesCIDRv6('2001:db8::1', 'fc00::', 7)).to.be.false;
        });

        it('should match address in fe80::/10 range', function () {
            expect(UrlValidationService._matchesCIDRv6('fe80::1', 'fe80::', 10)).to.be.true;
        });

        it('should match febf address in fe80::/10 range', function () {
            expect(UrlValidationService._matchesCIDRv6('febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 'fe80::', 10)).to.be.true;
        });

        it('should not match fec0:: against fe80::/10', function () {
            expect(UrlValidationService._matchesCIDRv6('fec0::1', 'fe80::', 10)).to.be.false;
        });

        it('should match any address in ::/0 range', function () {
            expect(UrlValidationService._matchesCIDRv6('2001:db8::1', '::', 0)).to.be.true;
        });

        it('should match address in /64 range', function () {
            expect(UrlValidationService._matchesCIDRv6('2001:0db8:0000:0000:ffff:ffff:ffff:ffff', '2001:0db8::', 64)).to.be.true;
        });

        it('should not match address outside /64 range', function () {
            expect(UrlValidationService._matchesCIDRv6('2001:0db8:0000:0001::1', '2001:0db8::', 64)).to.be.false;
        });
    });

    // ─── _matchesCIDR ────────────────────────────────────────────────

    describe('_matchesCIDR', function () {
        it('should match IPv4 address against IPv4 CIDR', function () {
            expect(UrlValidationService._matchesCIDR('192.168.1.5', '192.168.0.0/16')).to.be.true;
        });

        it('should not match IPv4 address against non-matching IPv4 CIDR', function () {
            expect(UrlValidationService._matchesCIDR('8.8.8.8', '192.168.0.0/16')).to.be.false;
        });

        it('should match IPv6 address against IPv6 CIDR', function () {
            expect(UrlValidationService._matchesCIDR('fe80::1', 'fe80::/10')).to.be.true;
        });

        it('should not match IPv4 address against IPv6 CIDR', function () {
            expect(UrlValidationService._matchesCIDR('192.168.1.1', 'fe80::/10')).to.be.false;
        });

        it('should not match IPv6 address against IPv4 CIDR', function () {
            expect(UrlValidationService._matchesCIDR('::1', '127.0.0.0/8')).to.be.false;
        });
    });

    // ─── _matchesEntry ───────────────────────────────────────────────

    describe('_matchesEntry', function () {
        it('should match exact IPv4 address', function () {
            expect(UrlValidationService._matchesEntry('127.0.0.1', '127.0.0.1')).to.be.true;
        });

        it('should not match different exact IPv4 address', function () {
            expect(UrlValidationService._matchesEntry('127.0.0.1', '127.0.0.2')).to.be.false;
        });

        it('should match exact IPv6 address', function () {
            expect(UrlValidationService._matchesEntry('::1', '::1')).to.be.true;
        });

        it('should match address against CIDR entry', function () {
            expect(UrlValidationService._matchesEntry('10.0.0.5', '10.0.0.0/8')).to.be.true;
        });

        it('should not match address against non-matching CIDR entry', function () {
            expect(UrlValidationService._matchesEntry('8.8.8.8', '10.0.0.0/8')).to.be.false;
        });
    });

    // ─── validate (with DNS mocking) ─────────────────────────────────

    describe('validate', function () {
        let originalLookup;
        let originalFilterMode;
        let originalFilterList;

        beforeEach(function () {
            originalLookup = dns.promises.lookup;
            originalFilterMode = process.env.URL_FILTER_MODE;
            originalFilterList = process.env.URL_FILTER_LIST;
            delete process.env.URL_FILTER_MODE;
            delete process.env.URL_FILTER_LIST;
        });

        afterEach(function () {
            dns.promises.lookup = originalLookup;
            if (originalFilterMode !== undefined) {
                process.env.URL_FILTER_MODE = originalFilterMode;
            } else {
                delete process.env.URL_FILTER_MODE;
            }
            if (originalFilterList !== undefined) {
                process.env.URL_FILTER_LIST = originalFilterList;
            } else {
                delete process.env.URL_FILTER_LIST;
            }
        });

        function mockDns(address) {
            dns.promises.lookup = async () => [{ address }];
        }

        function mockDnsMultiple(addresses) {
            dns.promises.lookup = async () => addresses.map(a => ({ address: a }));
        }

        // ─── Invalid URL ─────────────────────────────────────────

        it('should throw on invalid URL', async function () {
            try {
                await UrlValidationService.validate('not-a-url');
                expect.fail('should have thrown');
            } catch (err) {
                expect(err).to.be.instanceOf(Error);
            }
        });

        // ─── Blacklist mode (default) ────────────────────────────

        describe('blacklist mode (default)', function () {
            it('should reject localhost 127.0.0.1', async function () {
                mockDns('127.0.0.1');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should reject 127.255.255.254 (entire /8)', async function () {
                mockDns('127.255.255.254');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should reject 10.x private IP', async function () {
                mockDns('10.0.0.1');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should reject 172.16.x private IP', async function () {
                mockDns('172.16.0.1');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should reject 172.31.x private IP (upper /12 boundary)', async function () {
                mockDns('172.31.255.255');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should reject 192.168.x private IP', async function () {
                mockDns('192.168.1.1');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should reject 169.254.x link-local', async function () {
                mockDns('169.254.1.1');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should reject 0.x.x.x', async function () {
                mockDns('0.0.0.1');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should reject IPv6 loopback ::1', async function () {
                mockDns('::1');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should reject IPv6 unique-local (fc00::/7)', async function () {
                mockDns('fd00::1');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should reject IPv6 link-local (fe80::/10)', async function () {
                mockDns('fe80::1');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should allow public IPv4 address', async function () {
                mockDns('8.8.8.8');
                await UrlValidationService.validate('http://example.com');
            });

            it('should allow public IPv6 address', async function () {
                mockDns('2001:4860:4860::8888');
                await UrlValidationService.validate('http://example.com');
            });

            it('should allow 172.32.0.0 (just outside /12 range)', async function () {
                mockDns('172.32.0.1');
                await UrlValidationService.validate('http://example.com');
            });

            it('should reject when any resolved address is blacklisted', async function () {
                mockDnsMultiple(['8.8.8.8', '10.0.0.1']);
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should allow when all resolved addresses are public', async function () {
                mockDnsMultiple(['8.8.8.8', '8.8.4.4']);
                await UrlValidationService.validate('http://example.com');
            });
        });

        // ─── Blacklist mode with custom entries ──────────────────

        describe('blacklist mode with URL_FILTER_LIST', function () {
            it('should block custom CIDR entries in addition to defaults', async function () {
                process.env.URL_FILTER_LIST = '203.0.113.0/24';
                mockDns('203.0.113.5');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should still block default blacklist entries with custom list', async function () {
                process.env.URL_FILTER_LIST = '203.0.113.0/24';
                mockDns('127.0.0.1');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });

            it('should allow addresses not in default or custom blacklist', async function () {
                process.env.URL_FILTER_LIST = '203.0.113.0/24';
                mockDns('8.8.8.8');
                await UrlValidationService.validate('http://example.com');
            });
        });

        // ─── Whitelist mode ──────────────────────────────────────

        describe('whitelist mode', function () {
            beforeEach(function () {
                process.env.URL_FILTER_MODE = 'whitelist';
            });

            it('should throw if URL_FILTER_LIST is not set', async function () {
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('URL_FILTER_LIST must be set');
                }
            });

            it('should allow whitelisted hostname directly', async function () {
                process.env.URL_FILTER_LIST = 'example.com';
                mockDns('93.184.216.34');
                await UrlValidationService.validate('http://example.com');
            });

            it('should allow address matching whitelisted CIDR', async function () {
                process.env.URL_FILTER_LIST = '93.184.216.0/24';
                mockDns('93.184.216.34');
                await UrlValidationService.validate('http://example.com');
            });

            it('should reject address not in whitelist', async function () {
                process.env.URL_FILTER_LIST = '93.184.216.0/24';
                mockDns('8.8.8.8');
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('not in the whitelist');
                }
            });

            it('should reject if any resolved address is not whitelisted', async function () {
                process.env.URL_FILTER_LIST = '93.184.216.0/24';
                mockDnsMultiple(['93.184.216.34', '8.8.8.8']);
                try {
                    await UrlValidationService.validate('http://example.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('not in the whitelist');
                }
            });

            it('should allow when all resolved addresses are whitelisted', async function () {
                process.env.URL_FILTER_LIST = '93.184.216.0/24, 93.184.217.0/24';
                mockDnsMultiple(['93.184.216.34', '93.184.217.10']);
                await UrlValidationService.validate('http://example.com');
            });

            it('should be case-insensitive for mode', async function () {
                process.env.URL_FILTER_MODE = 'WHITELIST';
                process.env.URL_FILTER_LIST = 'example.com';
                mockDns('93.184.216.34');
                await UrlValidationService.validate('http://example.com');
            });
        });

        // ─── Blacklist hostname matching ─────────────────────────

        describe('blacklist hostname matching', function () {
            it('should reject hostname that is directly in the blacklist', async function () {
                process.env.URL_FILTER_LIST = 'evil.com';
                mockDns('8.8.8.8');
                try {
                    await UrlValidationService.validate('http://evil.com');
                    expect.fail('should have thrown');
                } catch (err) {
                    expect(err.message).to.include('blacklisted');
                }
            });
        });
    });
});
