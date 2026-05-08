import test from 'node:test';
import assert from 'node:assert';
import { io as Client } from 'socket.io-client';
import * as parser from 'socket.io-msgpack-parser';
import signIn from '../utils/auth';

import dotenv from 'dotenv';
dotenv.config({path: `${__dirname}/.env.stresstest`});

const SERVER_URL = process.env.VITE_API_URL;

test('Express Server Health Check', async (t) => {
    try {
        const response = await fetch(`${SERVER_URL}/api/health`);
        assert.strictEqual(response.status, 200, 'Health endpoint should return 200 OK');
        
        const data = await response.json();
        assert.strictEqual(data.status, 'healthy', 'Server should be healthy');
    } catch (e: any) {
        if (e.cause?.code === 'ECONNREFUSED') {
            assert.fail('Server is not running. Please start the server on port 3001 before running tests.');
        }
        throw e;
    }
});

test('Integration Health Check', async (t) => {
    try {
        const response = await fetch(`${SERVER_URL}/api/health/integration`);
        assert.strictEqual(response.status, 200, 'Integration endpoint should return 200 OK');
        
        const data = await response.json();
        assert.strictEqual(data.status, 'healthy', 'Integration should be healthy');
    } catch (e: any) {
        if (e.cause?.code === 'ECONNREFUSED') {
            assert.fail('Server is not running.');
        }
        throw e;
    }
});

test('Socket.IO Connection', async (t) => {
    const email = process.env.EMAIL;
    const password = process.env.PASSWORD;

    if (!email || !password) {
        console.warn('Skipping Socket.io test because process.env.EMAIL or process.env.PASSWORD is missing');
        return;
    }

    try {
        const { token } = await signIn(email, password);
        assert.ok(token, 'Should retrieve an auth token');

        const socket = Client(SERVER_URL, {
            auth: { token },
            transports: ["websocket", "polling"],
            parser
        });

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                socket.disconnect();
                reject(new Error('Socket connection timed out'));
            }, 5000);

            socket.on('connect', () => {
                clearTimeout(timeout);
                assert.ok(socket.id, 'Socket should have an ID');
                
                socket.disconnect();
                resolve();
            });

            socket.on('connect_error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    } catch (e: any) {
        assert.fail(`Socket connection test failed: ${e.message}`);
    }
});
