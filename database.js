const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const options = {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4, // IPv4
            compressors: ["zlib"],
        };

        await mongoose.connect(process.env.MONGO_URI, options);
        console.log("MongoDB Connected");

        // Connection event handlers
        mongoose.connection.on("error", (err) => {
            console.error("MongoDB connection error:", err);
        });

        mongoose.connection.on("disconnected", () => {
            console.warn("MongoDB disconnected");
        });

        mongoose.connection.on("reconnected", () => {
            console.log("MongoDB reconnected");
        });
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
        process.exit(1);
    }
};

module.exports = connectDB;