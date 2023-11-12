import { Database } from 'bun:sqlite';

const database = new Database(':memory:');
database.run('CREATE TABLE users (username TEXT, password TEXT)');
database.run('INSERT INTO users VALUES (?, ?)', ['hagen', Bun.hash('password123')]);
database.run('INSERT INTO users VALUES (?, ?)', ['hagen2', Bun.hash('password234')]);
const checkUserExistsQuery = database.prepare('SELECT count(*) as usersFound FROM users WHERE username = $username and password = $password');

export const UNAUTHORIZED = new Response('Unauthorized', { status: 401, headers: [ ['WWW-Authenticate', 'Basic realm="Node"'] ],  })

export const extractUsername = (req: Request): string => {
  const headerData = req.headers.get('Authorization');
  
  if (!!!headerData) {
    throw new Error();
  } else {
    const decodedHeaderData = atob(headerData.split(' ')[1])
    const [ username, password ] = decodedHeaderData.split(':');
    if (username === undefined) {
      throw new Error();
    } else {
      const result = checkUserExistsQuery.get({ '$username': username, '$password': Bun.hash(password) }) as { usersFound: number };
      if (result.usersFound !== 1) {
        throw new Error();
      }
      return username;
    }
  }
};