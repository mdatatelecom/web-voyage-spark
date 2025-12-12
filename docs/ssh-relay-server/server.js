/**
 * SSH WebSocket Relay Server
 * 
 * Este servidor aceita conexões WebSocket e as encaminha para servidores SSH reais.
 * Ideal para deploy em um VPS com Node.js.
 * 
 * Uso:
 *   1. npm install
 *   2. node server.js
 *   3. Configure a URL no Lovable: ws://SEU-IP:8080/ssh
 */

const { Server: WebSocketServer } = require('ws');
const { Client: SSHClient } = require('ssh2');
const http = require('http');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server for health checks
const httpServer = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'SSH WebSocket Relay',
      version: '1.0.0',
      sshAvailable: true,
      timestamp: new Date().toISOString(),
      usage: `ws://${req.headers.host}/ssh`
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer, path: '/ssh' });

console.log(`[${new Date().toISOString()}] SSH WebSocket Relay starting...`);

wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  console.log(`[${new Date().toISOString()}] New WebSocket connection from ${clientIP}`);

  let sshClient = null;
  let sshStream = null;
  let isConnected = false;
  let connectionConfig = null;

  // Send initial message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'SSH Relay conectado. Envie credenciais para iniciar sessão SSH.',
    sshAvailable: true
  }));

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`[${new Date().toISOString()}] Received: ${message.type}`);

      switch (message.type) {
        case 'connect':
          await handleConnect(message);
          break;

        case 'command':
          handleCommand(message.command);
          break;

        case 'data':
          // Raw terminal data
          if (sshStream && isConnected) {
            sshStream.write(message.data);
          }
          break;

        case 'resize':
          // Terminal resize
          if (sshStream && isConnected) {
            sshStream.setWindow(message.rows || 24, message.cols || 80);
          }
          break;

        case 'disconnect':
          handleDisconnect();
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          console.log(`[${new Date().toISOString()}] Unknown message type: ${message.type}`);
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error parsing message:`, err);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Erro ao processar mensagem: ' + err.message
      }));
    }
  });

  async function handleConnect(config) {
    const { host, port = 22, user, password, privateKey } = config;

    if (!host || !user) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Host e usuário são obrigatórios'
      }));
      return;
    }

    connectionConfig = { host, port, user };

    ws.send(JSON.stringify({
      type: 'status',
      message: `Conectando a ${user}@${host}:${port}...`,
      mode: 'connecting'
    }));

    sshClient = new SSHClient();

    sshClient.on('ready', () => {
      console.log(`[${new Date().toISOString()}] SSH connected to ${host}`);
      isConnected = true;

      // Request a shell
      sshClient.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err, stream) => {
        if (err) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Erro ao iniciar shell: ' + err.message
          }));
          return;
        }

        sshStream = stream;

        ws.send(JSON.stringify({
          type: 'session_started',
          message: `Conectado a ${user}@${host}:${port}`,
          prompt: `${user}@${host}:~$ `,
          mode: 'real_ssh',
          sshReal: true,
          hostReachable: true
        }));

        ws.send(JSON.stringify({
          type: 'ssh_ready',
          message: 'Sessão SSH iniciada'
        }));

        // Forward SSH output to WebSocket
        stream.on('data', (data) => {
          ws.send(JSON.stringify({
            type: 'output',
            content: data.toString('utf8')
          }));
        });

        stream.stderr.on('data', (data) => {
          ws.send(JSON.stringify({
            type: 'output',
            content: data.toString('utf8')
          }));
        });

        stream.on('close', () => {
          console.log(`[${new Date().toISOString()}] SSH stream closed`);
          isConnected = false;
          ws.send(JSON.stringify({
            type: 'disconnected',
            message: 'Sessão SSH encerrada'
          }));
        });
      });
    });

    sshClient.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] SSH error:`, err.message);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Erro SSH: ' + err.message
      }));
      isConnected = false;
    });

    sshClient.on('close', () => {
      console.log(`[${new Date().toISOString()}] SSH connection closed`);
      isConnected = false;
    });

    // Connect with password or private key
    const connectConfig = {
      host,
      port,
      username: user,
      readyTimeout: 30000,
      keepaliveInterval: 10000
    };

    if (privateKey) {
      connectConfig.privateKey = privateKey;
    } else if (password) {
      connectConfig.password = password;
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Senha ou chave privada é obrigatória'
      }));
      return;
    }

    try {
      sshClient.connect(connectConfig);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Connection error:`, err);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Falha ao conectar: ' + err.message
      }));
    }
  }

  function handleCommand(command) {
    if (!isConnected || !sshStream) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Não conectado. Envie credenciais primeiro.'
      }));
      return;
    }

    console.log(`[${new Date().toISOString()}] Executing: ${command}`);
    
    // Send command to SSH
    sshStream.write(command + '\n');
  }

  function handleDisconnect() {
    console.log(`[${new Date().toISOString()}] Client requested disconnect`);
    
    if (sshStream) {
      sshStream.end('exit\n');
      sshStream = null;
    }
    
    if (sshClient) {
      sshClient.end();
      sshClient = null;
    }
    
    isConnected = false;
    
    ws.send(JSON.stringify({
      type: 'disconnected',
      message: 'Conexão encerrada'
    }));
  }

  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] WebSocket closed from ${clientIP}`);
    handleDisconnect();
  });

  ws.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] WebSocket error:`, err);
    handleDisconnect();
  });
});

// Start server
httpServer.listen(PORT, HOST, () => {
  console.log(`[${new Date().toISOString()}] SSH WebSocket Relay running on http://${HOST}:${PORT}`);
  console.log(`[${new Date().toISOString()}] WebSocket endpoint: ws://${HOST}:${PORT}/ssh`);
  console.log(`[${new Date().toISOString()}] Health check: http://${HOST}:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] Shutting down...`);
  wss.clients.forEach((client) => {
    client.close();
  });
  httpServer.close(() => {
    process.exit(0);
  });
});
