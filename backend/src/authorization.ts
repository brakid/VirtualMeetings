import { Request, Response } from 'express';
import * as auth from 'basic-auth';

export const basicAuthHandler = (req: Request, res: Response, next: () => void) => {
  const user = auth.default(req);

  if (user === undefined || user['name'] !== 'USERNAME' || user['pass'] !== 'PASSWORD') {
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="Node"')
    res.end('Unauthorized')
  } else {
    next();
  }
};