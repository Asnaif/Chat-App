import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';
import { User } from '../models/User';
import { Setting } from '../models/Setting';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { Group } from '../models/Group';
import { Attachment } from '../models/Attachment';
import { Block } from '../models/Block';

const seedDatabase = async (): Promise<void> => {
  try {
    console.log('🌱 Starting Database Seeding Process...');

    // 1. Connect to MongoDB
    await mongoose.connect(ENV.MONGODB_URI);
    console.log(` Connected to MongoDB: ${ENV.MONGODB_URI}`);

    // 2. Clear old data to prevent duplicate key errors
    console.log('🧹 Cleaning existing data...');
    await Promise.all([
      User.deleteMany({}),
      Setting.deleteMany({}),
      Chat.deleteMany({}),
      Message.deleteMany({}),
      Group.deleteMany({}),
      Attachment.deleteMany({}),
      Block.deleteMany({}),
    ]);
    console.log(' Existing collections cleared.');

    // 3. Hash default password
    const defaultPassword = 'password123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    // 4. Create Dummy Users
    console.log('👤 Creating Dummy Users...');
    const usersData = [
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        passwordHash,
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop',
        about: 'Frontend Developer & UI Enthusiast ✨',
        status: 'online' as const,
        lastSeenAt: new Date(),
      },
      {
        name: 'Bob Smith',
        email: 'bob@example.com',
        passwordHash,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
        about: 'Backend Architect | Building scalable systems 🚀',
        status: 'online' as const,
        lastSeenAt: new Date(),
      },
      {
        name: 'Charlie Davis',
        email: 'charlie@example.com',
        passwordHash,
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop',
        about: 'Product Designer | Love minimal interfaces 🎨',
        status: 'offline' as const,
        lastSeenAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
      {
        name: 'Diana Prince',
        email: 'diana@example.com',
        passwordHash,
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop',
        about: 'DevOps & Cloud Engineer ☁️',
        status: 'offline' as const,
        lastSeenAt: new Date(Date.now() - 86400000), // 1 day ago
      },
    ];

    const [alice, bob, charlie, diana] = await User.insertMany(usersData);
    console.log(` Created ${usersData.length} Users successfully.`);

    // 5. Create Settings for each user
    console.log('⚙️ Creating Default User Settings...');
    const settingsData = [
      { userId: alice._id, theme: 'dark' as const, lastSeenPrivacy: 'everyone' as const, profilePhotoPrivacy: 'everyone' as const, readReceipts: true },
      { userId: bob._id, theme: 'dark' as const, lastSeenPrivacy: 'everyone' as const, profilePhotoPrivacy: 'everyone' as const, readReceipts: true },
      { userId: charlie._id, theme: 'light' as const, lastSeenPrivacy: 'contacts' as const, profilePhotoPrivacy: 'everyone' as const, readReceipts: true },
      { userId: diana._id, theme: 'system' as const, lastSeenPrivacy: 'nobody' as const, profilePhotoPrivacy: 'contacts' as const, readReceipts: false },
    ];
    await Setting.insertMany(settingsData);
    console.log(' User settings initialized.');

    // 6. Create 1:1 Direct Chat (Alice <-> Bob)
    console.log('💬 Creating Direct Chat between Alice and Bob...');
    const directChat = await Chat.create({
      type: 'direct',
      participantIds: [alice._id, bob._id],
    });

    const directMessages = [
      {
        chatId: directChat._id,
        senderId: alice._id,
        type: 'text' as const,
        text: 'Hey Bob! Did you check the latest API contracts for the chat app?',
        isStarred: false,
        deliveredTo: [bob._id],
        readBy: [bob._id],
        createdAt: new Date(Date.now() - 15 * 60000),
      },
      {
        chatId: directChat._id,
        senderId: bob._id,
        type: 'text' as const,
        text: 'Hey Alice! Yes, the backend endpoints and Socket.IO server are ready.',
        isStarred: true,
        deliveredTo: [alice._id],
        readBy: [alice._id],
        createdAt: new Date(Date.now() - 10 * 60000),
      },
      {
        chatId: directChat._id,
        senderId: alice._id,
        type: 'text' as const,
        text: 'Awesome! I am connecting the Redux auth state right now 🚀',
        isStarred: false,
        deliveredTo: [bob._id],
        readBy: [bob._id],
        createdAt: new Date(Date.now() - 5 * 60000),
      },
      {
        chatId: directChat._id,
        senderId: bob._id,
        type: 'text' as const,
      },
      {
        chatId: directChat._id,
        senderId: bob._id,
        type: 'image' as const,
        text: 'Here is the Figma dashboard preview for our chat app! 🖼️',
        attachments: [
          {
            storageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop',
            mimeType: 'image/jpeg',
            size: 245000,
            name: 'figma_preview.jpg',
          },
        ],
        isStarred: true,
        deliveredTo: [alice._id],
        readBy: [alice._id],
        createdAt: new Date(),
      },
    ];

    const createdDirectMessages = await Message.insertMany(directMessages);
    const lastDirectMessage = createdDirectMessages[createdDirectMessages.length - 1];

    // Seed Attachment for the media message
    await Attachment.create({
      ownerId: bob._id,
      messageId: lastDirectMessage._id,
      storageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop',
      mimeType: 'image/jpeg',
      size: 245000,
      name: 'figma_preview.jpg',
    });

    directChat.lastMessageId = lastDirectMessage._id;
    await directChat.save();
    console.log(' Direct chat and messages (including media attachment) created.');

    // 7. Create Group Chat ("Dev Squad")
    console.log('👥 Creating Group Chat ("Dev Squad")...');
    const groupChat = await Chat.create({
      type: 'group',
      participantIds: [alice._id, bob._id, charlie._id],
      title: 'Dev Squad',
      avatarUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop',
    });

    const group = await Group.create({
      chatId: groupChat._id,
      name: 'Dev Squad',
      description: 'Official workspace discussion and feature coordination.',
      avatarUrl: groupChat.avatarUrl,
      createdBy: bob._id,
      members: [
        { userId: bob._id, role: 'admin', joinedAt: new Date(Date.now() - 86400000) },
        { userId: alice._id, role: 'member', joinedAt: new Date(Date.now() - 86400000) },
        { userId: charlie._id, role: 'member', joinedAt: new Date(Date.now() - 43200000) },
      ],
    });

    const groupMessages = [
      {
        chatId: groupChat._id,
        senderId: bob._id,
        type: 'text' as const,
        text: 'Welcome team to the Dev Squad group! Let us coordinate our daily sprint here.',
        isStarred: false,
        deliveredTo: [alice._id, charlie._id],
        readBy: [alice._id, charlie._id],
        createdAt: new Date(Date.now() - 60 * 60000),
      },
      {
        chatId: groupChat._id,
        senderId: charlie._id,
        type: 'text' as const,
        text: 'The Figma designs for the conversation panel look super sleek! 🎨',
        isStarred: false,
        deliveredTo: [alice._id, bob._id],
        readBy: [alice._id, bob._id],
        createdAt: new Date(Date.now() - 30 * 60000),
      },
      {
        chatId: groupChat._id,
        senderId: alice._id,
        type: 'text' as const,
        text: 'Working on the three-panel layout today. All components are responsive!',
        isStarred: false,
        deliveredTo: [bob._id, charlie._id],
        readBy: [bob._id],
        createdAt: new Date(Date.now() - 10 * 60000),
      },
    ];

    const createdGroupMessages = await Message.insertMany(groupMessages);
    const lastGroupMessage = createdGroupMessages[createdGroupMessages.length - 1];

    groupChat.lastMessageId = lastGroupMessage._id;
    await groupChat.save();
    console.log(' Group chat ("Dev Squad") and messages created.');

    console.log('\n======================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('🔑 Test Users Credentials (Password for all: password123)');
    console.log('------------------------------------------------------');
    console.log('1. Alice Johnson  ->  alice@example.com   | password123');
    console.log('2. Bob Smith      ->  bob@example.com     | password123');
    console.log('3. Charlie Davis  ->  charlie@example.com | password123');
    console.log('4. Diana Prince   ->  diana@example.com   | password123');
    console.log('------------------------------------------------------');
    console.log(`💬 Sample Direct Chat ID: ${directChat._id}`);
    console.log(`👥 Sample Group Chat ID:  ${groupChat._id} (${group.name})`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedDatabase();
