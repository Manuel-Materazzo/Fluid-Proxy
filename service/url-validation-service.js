import dns from "dns";
import net from "net";

const DEFAULT_BLACKLIST = [
    '127.0.0.0/8',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
    '169.254.0.0/16',
    '0.0.0.0/8',
    '::1',
    'fc00::/7',
    'fe80::/10'
];

export default class UrlValidationService {

    static async validate(urlString) {
        const parsed = new URL(urlString);
        const hostname = parsed.hostname;

        const mode = (process.env.URL_FILTER_MODE || 'blacklist').toLowerCase();
        const filterList = process.env.URL_FILTER_LIST
            ? process.env.URL_FILTER_LIST.split(',').map(e => e.trim())
            : [];

        if (mode === 'whitelist') {
            if (filterList.length === 0) {
                throw new Error('URL_FILTER_LIST must be set when using whitelist mode');
            }
            await this._validateWhitelist(hostname, filterList);
        } else {
            const blacklist = filterList.length > 0
                ? [...DEFAULT_BLACKLIST, ...filterList]
                : DEFAULT_BLACKLIST;
            await this._validateBlacklist(hostname, blacklist);
        }
    }

    static async _validateWhitelist(hostname, whitelist) {
        // check if hostname itself is whitelisted
        if (whitelist.includes(hostname)) {
            return;
        }

        const addresses = await dns.promises.lookup(hostname, {all: true});

        for (const {address} of addresses) {
            const matched = whitelist.some(entry => this._matchesEntry(address, entry));
            if (!matched) {
                throw new Error(`Address ${address} (resolved from ${hostname}) is not in the whitelist`);
            }
        }
    }

    static async _validateBlacklist(hostname, blacklist) {
        // check if hostname itself is blacklisted
        if (blacklist.includes(hostname)) {
            throw new Error(`Hostname ${hostname} is blacklisted`);
        }

        const addresses = await dns.promises.lookup(hostname, {all: true});

        for (const {address} of addresses) {
            for (const entry of blacklist) {
                if (this._matchesEntry(address, entry)) {
                    throw new Error(`Address ${address} (resolved from ${hostname}) is blacklisted by rule ${entry}`);
                }
            }
        }
    }

    static _matchesEntry(address, entry) {
        if (entry.includes('/')) {
            return this._matchesCIDR(address, entry);
        }
        return address === entry;
    }

    static _matchesCIDR(address, cidr) {
        const [range, prefixStr] = cidr.split('/');
        const prefix = parseInt(prefixStr, 10);

        const isIPv6Address = net.isIPv6(address);
        const isIPv6Range = net.isIPv6(range);

        if (isIPv6Address !== isIPv6Range) {
            return false;
        }

        if (isIPv6Address) {
            return this._matchesCIDRv6(address, range, prefix);
        }
        return this._matchesCIDRv4(address, range, prefix);
    }

    static _matchesCIDRv4(address, range, prefix) {
        const addrNum = this._ipv4ToInt(address);
        const rangeNum = this._ipv4ToInt(range);
        const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
        return (addrNum & mask) === (rangeNum & mask);
    }

    static _ipv4ToInt(ip) {
        const parts = ip.split('.');
        return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    }

    static _matchesCIDRv6(address, range, prefix) {
        const addrBytes = this._ipv6ToBytes(address);
        const rangeBytes = this._ipv6ToBytes(range);

        let remaining = prefix;
        for (let i = 0; i < 16; i++) {
            if (remaining <= 0) {
                break;
            }
            const bits = Math.min(remaining, 8);
            const mask = (0xFF << (8 - bits)) & 0xFF;
            if ((addrBytes[i] & mask) !== (rangeBytes[i] & mask)) {
                return false;
            }
            remaining -= 8;
        }
        return true;
    }

    static _ipv6ToBytes(ip) {
        const expanded = this._expandIPv6(ip);
        const groups = expanded.split(':');
        const bytes = new Uint8Array(16);
        for (let i = 0; i < 8; i++) {
            const val = parseInt(groups[i], 16);
            bytes[i * 2] = (val >> 8) & 0xFF;
            bytes[i * 2 + 1] = val & 0xFF;
        }
        return bytes;
    }

    static _expandIPv6(ip) {
        // handle :: expansion
        let parts = ip.split('::');
        if (parts.length === 2) {
            const left = parts[0] ? parts[0].split(':') : [];
            const right = parts[1] ? parts[1].split(':') : [];
            const missing = 8 - left.length - right.length;
            const middle = Array(missing).fill('0000');
            parts = [...left, ...middle, ...right];
        } else {
            parts = ip.split(':');
        }
        return parts.map(p => p.padStart(4, '0')).join(':');
    }
}
