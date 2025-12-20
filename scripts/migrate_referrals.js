const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const generateReferralCode = () => {
    return 'FUEL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const users = await User.find({ referralCode: { $exists: false } });
        console.log(`Found ${users.length} users needing migration`);

        for (const user of users) {
            user.referralCode = generateReferralCode();
            await user.save();
            console.log(`Updated ${user.name} (${user.email}): ${user.referralCode}`);
        }

        console.log('Migration complete');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

migrate();
