import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs for different user types
const citizenInput: CreateUserInput = {
  email: 'citizen@example.com',
  full_name: 'John Doe',
  phone: '+1234567890',
  role: 'CITIZEN'
};

const staffInput: CreateUserInput = {
  email: 'staff@example.com',
  full_name: 'Jane Smith',
  phone: null,
  role: 'STAFF'
};

const adminInput: CreateUserInput = {
  email: 'admin@example.com',
  full_name: 'Admin User',
  phone: '+0987654321',
  role: 'ADMIN'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a citizen user', async () => {
    const result = await createUser(citizenInput);

    // Basic field validation
    expect(result.email).toEqual('citizen@example.com');
    expect(result.full_name).toEqual('John Doe');
    expect(result.phone).toEqual('+1234567890');
    expect(result.role).toEqual('CITIZEN');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a staff user', async () => {
    const result = await createUser(staffInput);

    expect(result.email).toEqual('staff@example.com');
    expect(result.full_name).toEqual('Jane Smith');
    expect(result.phone).toBeNull();
    expect(result.role).toEqual('STAFF');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an admin user', async () => {
    const result = await createUser(adminInput);

    expect(result.email).toEqual('admin@example.com');
    expect(result.full_name).toEqual('Admin User');
    expect(result.phone).toEqual('+0987654321');
    expect(result.role).toEqual('ADMIN');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(citizenInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('citizen@example.com');
    expect(users[0].full_name).toEqual('John Doe');
    expect(users[0].phone).toEqual('+1234567890');
    expect(users[0].role).toEqual('CITIZEN');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle null phone number correctly', async () => {
    const result = await createUser(staffInput);

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].phone).toBeNull();
    expect(result.phone).toBeNull();
  });

  it('should create users with unique emails', async () => {
    // Create first user
    const firstUser = await createUser(citizenInput);
    
    // Create second user with different email
    const secondInput: CreateUserInput = {
      ...citizenInput,
      email: 'different@example.com'
    };
    const secondUser = await createUser(secondInput);

    expect(firstUser.id).not.toEqual(secondUser.id);
    expect(firstUser.email).toEqual('citizen@example.com');
    expect(secondUser.email).toEqual('different@example.com');
  });

  it('should enforce email uniqueness', async () => {
    // Create first user
    await createUser(citizenInput);
    
    // Attempt to create second user with same email should fail
    await expect(createUser(citizenInput)).rejects.toThrow();
  });

  it('should set created_at timestamp automatically', async () => {
    const beforeCreation = new Date();
    const result = await createUser(citizenInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });

  it('should create multiple users with different roles', async () => {
    // Create all three types of users
    const citizen = await createUser(citizenInput);
    const staff = await createUser(staffInput);
    const admin = await createUser(adminInput);

    // Verify all users were created with correct roles
    expect(citizen.role).toEqual('CITIZEN');
    expect(staff.role).toEqual('STAFF');
    expect(admin.role).toEqual('ADMIN');

    // Verify they have unique IDs
    const ids = [citizen.id, staff.id, admin.id];
    expect(new Set(ids).size).toEqual(3);
  });
});