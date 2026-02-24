import bcrypt from 'bcrypt';

export const passwordUtil = {
    hash: async (pwd: string): Promise<string> => {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(pwd, salt);
    },

    compare: async (pwd: string, hash: string): Promise<boolean> => {
        return bcrypt.compare(pwd, hash);
    }
};
