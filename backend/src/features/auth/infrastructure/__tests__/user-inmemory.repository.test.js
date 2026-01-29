/**
 * 用户内存仓库测试（手机号体系）
 */
import { UserInMemoryRepository } from '../user-inmemory.repository.js';
import { User } from '../../domain/user.aggregate.js';

describe('UserInMemoryRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new UserInMemoryRepository();
    repository.users.clear();
  });

  describe('save', () => {
    it('should save a new user', async () => {
      const user = User.createWithPhone('13800138000');
      const savedUser = await repository.save(user);

      expect(savedUser).toBe(user);
      expect(repository.users.size).toBe(1);
    });

    it('should clear domain events after save', async () => {
      const user = User.createWithPhone('13800138000');
      expect(user.getDomainEvents()).toHaveLength(1);

      await repository.save(user);

      expect(user.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const user = User.createWithPhone('13800138000');
      await repository.save(user);

      const foundUser = await repository.findById(user.id.value);

      expect(foundUser).toBe(user);
      expect(foundUser.phone.value).toBe('13800138000');
    });
  });

  describe('findByPhone', () => {
    it('should find user by phone', async () => {
      const user = User.createWithPhone('13800138000');
      await repository.save(user);

      const foundUser = await repository.findByPhone('13800138000');

      expect(foundUser).toBe(user);
    });

    it('should return null when phone not found', async () => {
      const foundUser = await repository.findByPhone('13900139000');
      expect(foundUser).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete user by ID', async () => {
      const user = User.createWithPhone('13800138000');
      await repository.save(user);

      const result = await repository.delete(user.id.value);

      expect(result).toBe(true);
      expect(repository.users.size).toBe(0);
    });
  });
});
