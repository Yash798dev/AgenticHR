const mongoose = require('mongoose');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        console.log('\nTroubleshooting tips:');
        console.log('1. Check if your IP is whitelisted in MongoDB Atlas');
        console.log('2. Verify your connection string in .env');
        console.log('3. Disable antivirus/firewall temporarily');
        console.log('4. Try using a mobile hotspot');
        process.exit(1);
    }
};

module.exports = connectDB;