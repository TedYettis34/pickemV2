// Mock implementation of the database module for testing

export const getDatabase = jest.fn();
export const closeDatabasePool = jest.fn();
export const query = jest.fn();
export const transaction = jest.fn();

// Default mock implementations
getDatabase.mockResolvedValue({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn(),
  }),
});

query.mockResolvedValue([]);
closeDatabasePool.mockResolvedValue(undefined);
transaction.mockImplementation(async (callback) => {
  const mockClient = {
    query: jest.fn(),
  };
  return await callback(mockClient as unknown as import('pg').Pool);
});