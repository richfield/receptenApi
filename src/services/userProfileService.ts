import { UserProfileModel } from '../models/UserProfile';
import { RoleModel } from '../models/Role';
import { GroupModel } from '../models/Group';
import { UserProfile } from '../Types';
import mongoose from 'mongoose';

export async function getUserProfile(firebaseUID: string) {
let userProfile = await UserProfileModel.findOne({ firebaseUID }).populate('roles').populate('groups');
if (!userProfile) {
    userProfile = new UserProfileModel({ firebaseUID });
    await userProfile?.save();
    if(userProfile) {
        userProfile = await UserProfileModel.findOne({ firebaseUID }).populate('roles').populate('groups');
    }
}
return userProfile;
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
                return role._id.toHexString();
            }
            return null;
        })
    );

    const updated = await UserProfileModel.findOneAndUpdate(
        { firebaseUID },
        { $set: { ...rest, roles: [...new Set(roleIds)], groups: groups } },
        { new: true, upsert: true }
    ).populate('roles').populate('groups');
    return updated;
}

export async function getAllRoles() {
    return await RoleModel.find();
}

export async function getAllGroups() {
    return await GroupModel.find();
}