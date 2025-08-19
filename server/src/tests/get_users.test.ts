import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user data
const testUser1: CreateUserInput = {
  email: 'john.doe@example.com',
  full_name: 'John Doe',
  phone: '+6281234567890',
  role: 'CITIZEN'
};

const testUser2: CreateUserInput = {
  email: 'jane.staff@gov.id',
  full_name: 'Jane Smith',
  phone: null,
  role: 'STAFF'
};

const testUser3: CreateUserInput = {
  email: 'admin@gov.id',
  full_name: 'Administrator',
  phone: '+6281234567891',
  role: 'ADMIN'
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return single user', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser1).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].email).toEqual('john.doe@example.com');
    expect(result[0].full_name).toEqual('John Doe');
    expect(result[0].phone).toEqual('+6281234567890');
    expect(result[0].role).toEqual('CITIZEN');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return multiple users', async () => {
    // Create test users
    await db.insert(usersTable).values([testUser1, testUser2, testUser3]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Find users by email to verify all were returned
    const johnUser = result.find(u => u.email === 'john.doe@example.com');
    const janeUser = result.find(u => u.email === 'jane.staff@gov.id');
    const adminUser = result.find(u => u.email === 'admin@gov.id');

    expect(johnUser).toBeDefined();
    expect(janeUser).toBeDefined();
    expect(adminUser).toBeDefined();

    // Verify specific user data
    expect(johnUser?.full_name).toEqual('John Doe');
    expect(johnUser?.role).toEqual('CITIZEN');
    expect(johnUser?.phone).toEqual('+6281234567890');

    expect(janeUser?.full_name).toEqual('Jane Smith');
    expect(janeUser?.role).toEqual('STAFF');
    expect(janeUser?.phone).toBeNull();

    expect(adminUser?.full_name).toEqual('Administrator');
    expect(adminUser?.role).toEqual('ADMIN');
    expect(adminUser?.phone).toEqual('+6281234567891');
  });

  it('should return users with all required fields', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser1).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    // Verify all required fields are present
    expect(typeof user.id).toBe('number');
    expect(typeof user.email).toBe('string');
    expect(typeof user.full_name).toBe('string');
    expect(user.phone === null || typeof user.phone === 'string').toBe(true);
    expect(['CITIZEN', 'STAFF', 'ADMIN'].includes(user.role)).toBe(true);
    expect(user.created_at).toBeInstanceOf(Date);
  });

  it('should return users ordered by creation (database default)', async () => {
    // Insert users with slight delay to ensure different timestamps
    await db.insert(usersTable).values(testUser1).execute();
    
    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
    
    await db.insert(usersTable).values(testUser2).execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Should be in order of creation (assuming database returns in insert order)
    const firstUser = result[0];
    const secondUser = result[1];
    
    expect(firstUser.email).toEqual('john.doe@example.com');
    expect(secondUser.email).toEqual('jane.staff@gov.id');
    expect(firstUser.created_at <= secondUser.created_at).toBe(true);
  });

  it('should handle users with different roles correctly', async () => {
    // Create users with all possible roles
    await db.insert(usersTable).values([testUser1, testUser2, testUser3]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);

    // Count roles
    const citizenCount = result.filter(u => u.role === 'CITIZEN').length;
    const staffCount = result.filter(u => u.role === 'STAFF').length;
    const adminCount = result.filter(u => u.role === 'ADMIN').length;

    expect(citizenCount).toBe(1);
    expect(staffCount).toBe(1);
    expect(adminCount).toBe(1);
  });

  it('should handle null phone numbers correctly', async () => {
    // Create user with null phone
    await db.insert(usersTable).values(testUser2).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].phone).toBeNull();
    expect(result[0].email).toEqual('jane.staff@gov.id');
  });
});