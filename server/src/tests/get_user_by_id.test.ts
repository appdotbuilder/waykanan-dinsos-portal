import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';

// Test user input
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  full_name: 'Test User',
  phone: '1234567890',
  role: 'CITIZEN'
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a user when found', async () => {
    // Create a test user first
    const createResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const createdUser = createResult[0];

    // Test getting the user by ID
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual('test@example.com');
    expect(result!.full_name).toEqual('Test User');
    expect(result!.phone).toEqual('1234567890');
    expect(result!.role).toEqual('CITIZEN');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when user is not found', async () => {
    const result = await getUserById(999);

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        full_name: 'User One',
        phone: '1111111111',
        role: 'CITIZEN'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        full_name: 'User Two',
        phone: '2222222222',
        role: 'STAFF'
      })
      .returning()
      .execute();

    const user1 = user1Result[0];
    const user2 = user2Result[0];

    // Test getting specific users
    const result1 = await getUserById(user1.id);
    const result2 = await getUserById(user2.id);

    expect(result1).not.toBeNull();
    expect(result1!.id).toEqual(user1.id);
    expect(result1!.email).toEqual('user1@example.com');
    expect(result1!.full_name).toEqual('User One');
    expect(result1!.role).toEqual('CITIZEN');

    expect(result2).not.toBeNull();
    expect(result2!.id).toEqual(user2.id);
    expect(result2!.email).toEqual('user2@example.com');
    expect(result2!.full_name).toEqual('User Two');
    expect(result2!.role).toEqual('STAFF');
  });

  it('should handle users with nullable phone field', async () => {
    // Create user without phone
    const createResult = await db.insert(usersTable)
      .values({
        email: 'nophone@example.com',
        full_name: 'No Phone User',
        phone: null,
        role: 'ADMIN'
      })
      .returning()
      .execute();

    const createdUser = createResult[0];

    // Test getting the user by ID
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual('nophone@example.com');
    expect(result!.full_name).toEqual('No Phone User');
    expect(result!.phone).toBeNull();
    expect(result!.role).toEqual('ADMIN');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should handle different user roles correctly', async () => {
    const roles = ['CITIZEN', 'STAFF', 'ADMIN'] as const;
    const userIds: number[] = [];

    // Create users with different roles
    for (const role of roles) {
      const createResult = await db.insert(usersTable)
        .values({
          email: `${role.toLowerCase()}@example.com`,
          full_name: `${role} User`,
          phone: '1234567890',
          role: role
        })
        .returning()
        .execute();

      userIds.push(createResult[0].id);
    }

    // Test each user
    for (let i = 0; i < roles.length; i++) {
      const result = await getUserById(userIds[i]);

      expect(result).not.toBeNull();
      expect(result!.role).toEqual(roles[i]);
      expect(result!.email).toEqual(`${roles[i].toLowerCase()}@example.com`);
    }
  });
});