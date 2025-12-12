import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if it's a WebSocket upgrade request
  if (upgradeHeader.toLowerCase() !== "websocket") {
    console.log("Not a WebSocket request, returning info");
    return new Response(
      JSON.stringify({ 
        status: "ok", 
        message: "Terminal Proxy WebSocket endpoint. Connect via WebSocket.",
        usage: "wss://gszsufxjstgpsxikgeeb.supabase.co/functions/v1/terminal-proxy"
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  console.log("Upgrading to WebSocket connection");
  
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let isConnected = false;
  let connectionConfig: { host: string; port: number; user: string } | null = null;
  
  // Command simulation for demo purposes
  // In production, you'd connect to actual SSH or use a library
  const processCommand = (cmd: string, config: { host: string; user: string }): string => {
    const trimmedCmd = cmd.trim().toLowerCase();
    
    const commands: Record<string, () => string> = {
      'help': () => `Available commands:
  help      - Show this help
  clear     - Clear terminal
  whoami    - Show current user
  hostname  - Show host name
  uptime    - Show uptime
  date      - Show date and time
  ip        - Show network info
  ping      - Test connectivity
  ls        - List files
  pwd       - Print working directory
  uname     - System information
  df        - Disk usage
  free      - Memory usage
  exit      - Disconnect`,
      'whoami': () => config.user,
      'hostname': () => config.host,
      'uptime': () => ` ${new Date().toLocaleTimeString()} up 45 days, 3:21, 1 user, load average: 0.08, 0.12, 0.10`,
      'date': () => new Date().toString(),
      'ip': () => `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${config.host}  netmask 255.255.255.0  broadcast ${config.host.split('.').slice(0, 3).join('.')}.255
        inet6 fe80::1  prefixlen 64  scopeid 0x20<link>
        ether 00:00:00:00:00:00  txqueuelen 1000  (Ethernet)`,
      'ping': () => `PING ${config.host} (${config.host}): 56 data bytes
64 bytes from ${config.host}: icmp_seq=0 ttl=64 time=0.5 ms
64 bytes from ${config.host}: icmp_seq=1 ttl=64 time=0.4 ms
64 bytes from ${config.host}: icmp_seq=2 ttl=64 time=0.3 ms
--- ${config.host} ping statistics ---
3 packets transmitted, 3 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 0.3/0.4/0.5/0.1 ms`,
      'ls': () => `total 48
drwxr-xr-x  2 ${config.user} ${config.user} 4096 Dec 12 00:00 Documents
drwxr-xr-x  2 ${config.user} ${config.user} 4096 Dec 12 00:00 Downloads
drwxr-xr-x  2 ${config.user} ${config.user} 4096 Dec 12 00:00 scripts
-rw-r--r--  1 ${config.user} ${config.user}  220 Dec 12 00:00 .bashrc
-rw-r--r--  1 ${config.user} ${config.user}  807 Dec 12 00:00 .profile`,
      'pwd': () => `/home/${config.user}`,
      'uname': () => `Linux ${config.host} 5.15.0-generic #1 SMP x86_64 GNU/Linux`,
      'df': () => `Filesystem     1K-blocks      Used Available Use% Mounted on
/dev/sda1      102400000  45000000  52400000  47% /
tmpfs            8192000         0   8192000   0% /dev/shm`,
      'free': () => `              total        used        free      shared  buff/cache   available
Mem:       16384000     4096000     8192000      256000     4096000    11776000
Swap:       4096000           0     4096000`,
      'clear': () => '__CLEAR__',
    };

    if (commands[trimmedCmd]) {
      return commands[trimmedCmd]();
    }

    // Handle commands with arguments
    if (trimmedCmd.startsWith('ping ')) {
      const target = cmd.trim().substring(5);
      return `PING ${target}: 56 data bytes
64 bytes from ${target}: icmp_seq=0 ttl=64 time=12.5 ms
64 bytes from ${target}: icmp_seq=1 ttl=64 time=11.8 ms
--- ${target} ping statistics ---
2 packets transmitted, 2 packets received, 0.0% packet loss`;
    }

    if (trimmedCmd.startsWith('echo ')) {
      return cmd.trim().substring(5);
    }

    if (trimmedCmd.startsWith('cat ')) {
      return `cat: ${cmd.trim().substring(4)}: Permission denied`;
    }

    return `bash: ${cmd}: command not found`;
  };

  socket.onopen = () => {
    console.log("WebSocket connection opened");
    socket.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket proxy connected. Send connect event with host, port, and user.'
    }));
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("Received message:", message.type);

      switch (message.type) {
        case 'connect':
          // Handle connection request
          const { host, port, user } = message;
          console.log(`Connection request to ${user}@${host}:${port}`);
          
          connectionConfig = { host, port, user };
          isConnected = true;
          
          socket.send(JSON.stringify({
            type: 'session_started',
            message: `Connected to ${user}@${host}:${port}`,
            prompt: `${user}@${host}:~$ `
          }));
          
          // Send welcome message
          socket.send(JSON.stringify({
            type: 'output',
            content: `Welcome to ${host}
Last login: ${new Date().toLocaleString()} from 192.168.1.1
Type 'help' for available commands.
`
          }));
          break;

        case 'command':
          if (!isConnected || !connectionConfig) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'Not connected. Send connect event first.'
            }));
            return;
          }

          const cmd = message.command;
          console.log(`Processing command: ${cmd}`);
          
          if (cmd.toLowerCase().trim() === 'exit') {
            socket.send(JSON.stringify({
              type: 'disconnected',
              message: 'Connection closed.'
            }));
            isConnected = false;
            connectionConfig = null;
            return;
          }

          const output = processCommand(cmd, connectionConfig);
          
          if (output === '__CLEAR__') {
            socket.send(JSON.stringify({
              type: 'clear'
            }));
          } else {
            socket.send(JSON.stringify({
              type: 'output',
              content: output,
              prompt: `${connectionConfig.user}@${connectionConfig.host}:~$ `
            }));
          }
          break;

        case 'disconnect':
          isConnected = false;
          connectionConfig = null;
          socket.send(JSON.stringify({
            type: 'disconnected',
            message: 'Disconnected from server.'
          }));
          break;

        case 'ping':
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
          break;

        default:
          socket.send(JSON.stringify({
            type: 'error',
            message: `Unknown message type: ${message.type}`
          }));
      }
    } catch (error) {
      console.error("Error processing message:", error);
      socket.send(JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
    isConnected = false;
    connectionConfig = null;
  };

  return response;
});
