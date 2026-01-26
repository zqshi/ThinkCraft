/**
 * 用户内存仓库测试
 */
import { UserInMemoryRepository } from '../user-inmemory.repository.js';
import { User } from '../../domain/user.aggregate.js';
import { UserId } from '../../domain/value-objects/user-id.vo.js';
import { Username } from '../../domain/value-objects/username.vo.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { Password } from '../../domain/value-objects/password.vo.js';
import { UserStatus } from '../../domain/value-objects/user-status.vo.js';

describe('UserInMemoryRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new UserInMemoryRepository();
    // 清空仓库（保留demo用户）
    repository.users.clear();
  });

  describe('save', () => {
    it('should save a new user', async () => {
      const user = User.create('testuser', 'test@example.com', 'password123');

      const savedUser = await repository.save(user);

      expect(savedUser).toBe(user);
      expect(repository.users.size).toBe(1);
    });

    it('should update an existing user', async () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      await repository.save(user);

      // 修改用户
      user.changePassword('password123', 'newpassword456');
      await repository.save(user);

      expect(repository.users.size).toBe(1);
      const foundUser = await repository.findById(user.id.value);
      expect(foundUser).toBe(user);
    });

    it('should clear domain events after save', async () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      expect(user.getDomainEvents()).toHaveLength(1);

      await repository.save(user);

      expect(user.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should find user by ID string', async () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      await repository.save(user);

      const foundUser = await repository.findById(user.id.value);

      expect(foundUser).toBe(user);
      expect(foundUser.username.value).toBe('testuser');
    });

    it('should find user by UserId object', async () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      await repository.save(user);

      const foundUser = await repository.findById(user.id);

      expect(foundUser).toBe(user);
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await repository.findById('non-existent-id');

      expect(foundUser).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username string', async () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      await repository.save(user);

      const foundUser = await repository.findByUsername('testuser');

      expect(foundUser).toBe(user);
    });

    it('should find user by Username object', async () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      await repository.save(user);

      const foundUser = await repository.findByUsername(new Username('testuser'));

      expect(foundUser).toBe(user);
    });

    it('should return null for non-existent username', async () => {
      const foundUser = await repository.findByUsername('nonexistent');

      expect(foundUser).toBeNull();
    });

    it('should be case-insensitive', async () => {
      const user = User.create('TestUser', 'test@example.com', 'password123');
      await repository.save(user);

      const foundUser = await repository.findByUsername('testuser');

      expect(foundUser).toBe(user);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email string', async () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      await repository.save(user);

      const foundUser = await repository.findByEmail('test@example.com');

      expect(foundUser).toBe(user);
    });

    it('should find user by Email object', async () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      await repository.save(user);

      const foundUser = await repository.findByEmail(new Email('test@example.com'));

      expect(foundUser).toBe(user);
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await repository.findByEmail('nonexistent@example.com');

      expect(foundUser).toBeNull();
    });

    it('should be case-insensitive', async () => {
      const user = User.create('testuser', 'Test@Example.com', 'password123');
      await repository.save(user);

      const foundUser = await repository.findByEmail('test@example.com');

      expect(foundUser).toBe(user);
    });
  });

  describe('delete', () => {
    it('should delete user by ID string', async () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      await repository.save(user);

      const result = await repository.delete(user.id.value);

      expect(result).toBe(true);
      expect(repository.users.size).toBe(0);
    });

    it('should delete user by UserId object', async () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      await repository.save(user);

      const result = await repository.delete(user.id);

      expect(result).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      const result = await repository.delete('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('existsByUsername', () => {
    it('should return true if username exists', async () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      await repository.save(user);

      const exists = await repository.existsByUsername('testuser');

      expect(exists).toBe(true);
    });

    it('should return false if username does not exist', async () => {
      const exists = await repository.existsByUsername('nonexistent');

      expect(exists).toBe(false);
    });
  });

  describe('existsByEmail', () => {
    it('should return true if email exists', async () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      await repository.save(user);

      const exists = await repository.existsByEmail('test@example.com');

      expect(exists).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      const exists = await repository.existsByEmail('nonexistent@example.com');

      expect(exists).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const user1 = User.create('user1', 'user1@example.com', 'password123');
      const user2 = User.create('user2', 'user2@example.com', 'password123');
      await repository.save(user1);
      await repository.save(user2);

      const users = await repository.findAll();

      expect(users).toHaveLength(2);
      expect(users).toContain(user1);
      expect(users).toContain(user2);
    });

    it('should return empty array when no users', async () => {
      const users = await repository.findAll();

      expect(users).toHaveLength(0);
    });
  });

  describe('count', () => {
    it('should return correct user count', async () => {
      expect(await repository.count()).toBe(0);

      const user1 = User.create('user1', 'user1@example.com', 'password123');
      await repository.save(user1);
      expect(await repository.count()).toBe(1);

      const user2 = User.create('user2', 'user2@example.com', 'password123');
      await repository.save(user2);
      expect(await repository.count()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all users', async () => {
      const user1 = User.create('user1', 'user1@example.com', 'password123');
      const user2 = User.create('user2', 'user2@example.com', 'password123');
      await repository.save(user1);
      await repository.save(user2);

      await repository.clear();

      expect(await repository.count()).toBe(0);
    });
  });

  describe('nextId', () => {
    it('should generate unique IDs', () => {
      const id1 = repository.nextId();
      const id2 = repository.nextId();

      expect(id1).toBeInstanceOf(UserId);
      expect(id2).toBeInstanceOf(UserId);
      expect(id1.value).not.toBe(id2.value);
    });
  });
});
