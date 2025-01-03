import { UserProfileModel } from '../models/UserProfile';
import { RoleModel } from '../models/Role';
import { GroupModel } from '../models/Group';
import { UserProfile } from '../Types';
import mongoose from 'mongoose';

export async function getUserProfile(firebaseUID: string) {
    return await UserProfileModel.findOne({ firebaseUID }).populate('roles').populate('groups');
}

export async function setUserProfile(firebaseUID: string, profileData: Partial<UserProfile>) {
    const { roles = [], groups, ...rest } = profileData;

    // Check if this is the first user profile

    const adminRole = await RoleModel.findOneAndUpdate(
        { name: 'admin' },
        { name: 'admin' },
        { new: true, upsert: true }
    );
    const userProfileCount = await UserProfileModel.countDocuments({ roles: adminRole._id });
    if (userProfileCount === 0) {
        if (adminRole && adminRole._id && mongoose.Types.ObjectId.isValid(adminRole._id)) {
            roles.push(adminRole._id.toHexString());
        }
    }

    const roleIds = await Promise.all(
        roles.map(async (roleId) => {
            const role = await RoleModel.findById(roleId);
            if (role) {
                return role._id;
            }
            return null;
        })
    );

    const groupIds = await Promise.all(
        (groups || []).map(async (groupName) => {
            const group = await GroupModel.findOneAndUpdate(
                { name: groupName },
                { name: groupName },
                { new: true, upsert: true }
            );
            return group._id;
        })
    );

    return await UserProfileModel.findOneAndUpdate(
        { firebaseUID },
        { $set: { ...rest, roles: roleIds.filter(Boolean), groups: groupIds } },
        { new: true, upsert: true }
    ).populate('roles').populate('groups');
}

export async function getAllRoles() {
    return await RoleModel.find();
}

export async function getAllGroups() {
    return await GroupModel.find();
}