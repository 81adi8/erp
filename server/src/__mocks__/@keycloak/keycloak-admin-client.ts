/**
 * Mock for @keycloak/keycloak-admin-client
 * 
 * This module is mocked for tests since KEYCLOAK_ENABLED=false
 */

const KcAdminClient = jest.fn().mockImplementation(() => ({
  auth: jest.fn().mockResolvedValue(undefined),
  users: {
    create: jest.fn().mockResolvedValue({ id: 'mock-user-id' }),
    find: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(undefined),
  },
  roles: {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue(undefined),
  },
  realms: {
    create: jest.fn().mockResolvedValue(undefined),
  },
}));

export default KcAdminClient;
export { KcAdminClient };