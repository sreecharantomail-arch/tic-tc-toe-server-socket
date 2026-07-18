const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
    try {
        const options = {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4, // IPv4
            compressors: ['zlib'],
        };

        try {
            await mongoose.connect(process.env.MONGO_URI, options);
        } catch (err) {
            // mongodb+srv:// URIs need an SRV DNS lookup, which uses Node's
            // resolver (dns.resolveSrv). If the system DNS is a local proxy
            // that refuses those queries (e.g. 127.0.0.1), retry once with
            // public resolvers. This only affects dns.resolve* calls, not
            // normal hostname lookups.
            const srvDnsFailure =
                err.code === 'ECONNREFUSED' && String(err.syscall || '').startsWith('query');
            if (!srvDnsFailure) {
                throw err;
            }
            console.warn('SRV DNS lookup failed via system resolver, retrying with public DNS');
            dns.setServers(['8.8.8.8', '1.1.1.1']);
            await mongoose.connect(process.env.MONGO_URI, options);
        }
        console.info('MongoDB Connected');

        // Connection event handlers
        mongoose.connection.on('error', err => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.info('MongoDB reconnected');
        });
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        console.warn('Continuing without MongoDB. Auth and match persistence will not work.');
    }
};

module.exports = connectDB;
