import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Connection mode - real SSH not available in Deno Deploy, using enhanced simulation
type ConnectionMode = 'real_ssh' | 'simulated';

// Test real TCP connectivity to determine if host is reachable on SSH port
const testTCPConnectivity = async (host: string, port: number): Promise<{ reachable: boolean; latency: number }> => {
  const startTime = Date.now();
  try {
    // Try to connect using Deno's TCP
    const conn = await Deno.connect({ hostname: host, port, transport: "tcp" });
    const latency = Date.now() - startTime;
    conn.close();
    return { reachable: true, latency };
  } catch (err) {
    console.log(`TCP connection test failed: ${err}`);
    return { reachable: false, latency: Date.now() - startTime };
  }
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
        sshAvailable: false,
        note: "Real SSH requires external proxy. Enhanced simulation mode with TCP connectivity test.",
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
  let connectionMode: ConnectionMode = 'simulated';
  let connectionConfig: { host: string; port: number; user: string; password?: string } | null = null;
  let hostReachable = false;
  
  // Enhanced command simulation with comprehensive outputs
  const processSimulatedCommand = (cmd: string, config: { host: string; user: string }): string => {
    const trimmedCmd = cmd.trim().toLowerCase();
    const originalCmd = cmd.trim();
    
    const commands: Record<string, () => string> = {
      'help': () => `Comandos disponíveis:
  help        - Mostra esta ajuda
  clear       - Limpa o terminal
  whoami      - Mostra usuário atual
  hostname    - Mostra o nome do host
  uptime      - Mostra tempo de atividade
  date        - Mostra data e hora
  ip          - Mostra informações de rede
  ip addr     - Mostra endereços de rede
  ifconfig    - Mostra configuração de interfaces
  ping        - Testa conectividade
  ls          - Lista arquivos
  pwd         - Mostra diretório atual
  uname       - Informações do sistema
  uname -a    - Informações detalhadas do sistema
  df          - Uso de disco
  df -h       - Uso de disco (formato humano)
  free        - Uso de memória
  free -h     - Uso de memória (formato humano)
  top         - Processos em execução
  ps aux      - Lista de processos
  netstat     - Conexões de rede
  ss          - Status de sockets
  cat         - Exibe conteúdo de arquivo
  exit        - Desconecta`,
      'whoami': () => config.user,
      'hostname': () => config.host,
      'uptime': () => ` ${new Date().toLocaleTimeString()} up 127 days, 14:52, 3 users, load average: 0.15, 0.22, 0.18`,
      'date': () => new Date().toString(),
      'ip': () => `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff
    inet ${config.host}/24 brd ${config.host.split('.').slice(0, 3).join('.')}.255 scope global eth0
       valid_lft forever preferred_lft forever`,
      'ip addr': () => commands['ip'](),
      'ifconfig': () => `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${config.host}  netmask 255.255.255.0  broadcast ${config.host.split('.').slice(0, 3).join('.')}.255
        inet6 fe80::42:acff:fe11:2  prefixlen 64  scopeid 0x20<link>
        ether 02:42:ac:11:00:02  txqueuelen 0  (Ethernet)
        RX packets 1842531  bytes 2156892451 (2.0 GiB)
        TX packets 1653287  bytes 892156324 (850.9 MiB)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)`,
      'ping': () => `PING ${config.host} (${config.host}): 56 data bytes
64 bytes from ${config.host}: icmp_seq=0 ttl=64 time=0.5 ms
64 bytes from ${config.host}: icmp_seq=1 ttl=64 time=0.4 ms
64 bytes from ${config.host}: icmp_seq=2 ttl=64 time=0.3 ms
--- ${config.host} ping statistics ---
3 packets transmitted, 3 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 0.3/0.4/0.5/0.1 ms`,
      'ls': () => `total 56
drwxr-xr-x  5 ${config.user} ${config.user} 4096 Dec 12 00:00 .
drwxr-xr-x  3 root   root   4096 Dec 01 00:00 ..
-rw-------  1 ${config.user} ${config.user} 1892 Dec 12 00:00 .bash_history
-rw-r--r--  1 ${config.user} ${config.user}  220 Dec 01 00:00 .bashrc
drwx------  2 ${config.user} ${config.user} 4096 Dec 05 00:00 .cache
drwxr-xr-x  3 ${config.user} ${config.user} 4096 Dec 05 00:00 .config
drwxr-xr-x  2 ${config.user} ${config.user} 4096 Dec 12 00:00 Documents
drwxr-xr-x  2 ${config.user} ${config.user} 4096 Dec 10 00:00 Downloads
-rw-r--r--  1 ${config.user} ${config.user}  807 Dec 01 00:00 .profile
drwxr-xr-x  2 ${config.user} ${config.user} 4096 Dec 08 00:00 scripts
-rw-------  1 ${config.user} ${config.user}   33 Dec 12 00:00 .lesshst
drwx------  2 ${config.user} ${config.user} 4096 Dec 05 00:00 .ssh`,
      'ls -la': () => commands['ls'](),
      'ls -l': () => commands['ls'](),
      'pwd': () => `/home/${config.user}`,
      'uname': () => `Linux`,
      'uname -a': () => `Linux ${config.host} 5.15.0-91-generic #101-Ubuntu SMP Tue Nov 14 13:30:08 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux`,
      'df': () => `Filesystem     1K-blocks      Used Available Use% Mounted on
udev             8134552         0   8134552   0% /dev
tmpfs            1634836      2240   1632596   1% /run
/dev/sda1      102400000  45632100  51545244  47% /
tmpfs            8174172         0   8174172   0% /dev/shm
tmpfs               5120         4      5116   1% /run/lock
/dev/sda2      204800000  98234567  96112345  51% /home
tmpfs            1634834        88   1634746   1% /run/user/1000`,
      'df -h': () => `Filesystem      Size  Used Avail Use% Mounted on
udev            7.8G     0  7.8G   0% /dev
tmpfs           1.6G  2.2M  1.6G   1% /run
/dev/sda1        98G   44G   50G  47% /
tmpfs           7.8G     0  7.8G   0% /dev/shm
tmpfs           5.0M  4.0K  5.0M   1% /run/lock
/dev/sda2       196G   94G   92G  51% /home
tmpfs           1.6G   88K  1.6G   1% /run/user/1000`,
      'free': () => `              total        used        free      shared  buff/cache   available
Mem:       16348928     4125632     8234156      256048     3989140    11682196
Swap:       4194304           0     4194304`,
      'free -h': () => `              total        used        free      shared  buff/cache   available
Mem:           15Gi       3.9Gi       7.9Gi       250Mi       3.8Gi        11Gi
Swap:         4.0Gi          0B       4.0Gi`,
      'top': () => `top - ${new Date().toLocaleTimeString()} up 127 days, 14:52,  3 users,  load average: 0.15, 0.22, 0.18
Tasks: 245 total,   1 running, 244 sleeping,   0 stopped,   0 zombie
%Cpu(s):  2.3 us,  0.8 sy,  0.0 ni, 96.5 id,  0.2 wa,  0.0 hi,  0.2 si,  0.0 st
MiB Mem :  15973.4 total,   8042.3 free,   4028.9 used,   3902.1 buff/cache
MiB Swap:   4096.0 total,   4096.0 free,      0.0 used.  11407.6 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
   1234 ${config.user}    20   0  825472  45312  32456 S   2.0   0.3   8:42.15 nginx
   2345 ${config.user}    20   0 1234568 125432  45678 S   1.5   0.8  15:23.45 node
   3456 root      20   0  456789  23456  12345 S   0.5   0.1   3:12.34 sshd
   4567 ${config.user}    20   0  234567  12345   8901 S   0.3   0.1   1:45.67 bash`,
      'ps aux': () => `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.0 169352 11892 ?        Ss   Oct15   0:15 /sbin/init
root         234  0.0  0.0  18544  3012 ?        Ss   Oct15   0:00 /lib/systemd/systemd-journald
root         456  0.0  0.0  23456  5678 ?        Ss   Oct15   0:05 /usr/sbin/sshd -D
${config.user}     1234  0.1  0.3 825472 45312 ?        Sl   09:15   8:42 nginx: master process
${config.user}     2345  0.2  0.8 1234568 125432 ?      Sl   09:15  15:23 node /app/server.js
${config.user}     3456  0.0  0.0  10632  3892 pts/0    Ss   12:34   0:00 -bash
${config.user}     4567  0.0  0.0  11456  2256 pts/0    R+   12:45   0:00 ps aux`,
      'netstat': () => `Active Internet connections (w/o servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 ${config.host}:22       192.168.1.100:52341     ESTABLISHED
tcp        0      0 ${config.host}:443      10.0.0.50:45678         ESTABLISHED
tcp        0      0 ${config.host}:443      10.0.0.51:45679         ESTABLISHED
tcp        0      0 ${config.host}:3306     10.0.0.100:34567        ESTABLISHED`,
      'netstat -tulpn': () => `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      456/sshd
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      1234/nginx
tcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN      1234/nginx
tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN      789/mysqld
tcp6       0      0 :::22                   :::*                    LISTEN      456/sshd`,
      'ss': () => commands['netstat'](),
      'ss -tulpn': () => commands['netstat -tulpn'](),
      'clear': () => '__CLEAR__',
      'w': () => ` ${new Date().toLocaleTimeString()} up 127 days, 14:52,  3 users,  load average: 0.15, 0.22, 0.18
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
${config.user}   pts/0    192.168.1.100    12:34    0.00s  0.05s  0.00s w
admin    pts/1    192.168.1.101    10:15    2:19m  0.02s  0.02s -bash
monitor  pts/2    10.0.0.50        08:00    4:34m  0.01s  0.01s top`,
      'who': () => commands['w'](),
      'id': () => `uid=1000(${config.user}) gid=1000(${config.user}) groups=1000(${config.user}),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev),110(lxd)`,
      'env': () => `USER=${config.user}
HOME=/home/${config.user}
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LANG=en_US.UTF-8
TERM=xterm-256color
SSH_CLIENT=192.168.1.100 52341 22
SSH_CONNECTION=192.168.1.100 52341 ${config.host} 22`,
      'printenv': () => commands['env'](),
      'history': () => `    1  ls -la
    2  cd Documents
    3  cat config.txt
    4  ping 8.8.8.8
    5  uptime
    6  df -h
    7  free -h
    8  ps aux
    9  netstat -tulpn
   10  history`,
    };

    // Exact match
    if (commands[trimmedCmd]) {
      return commands[trimmedCmd]();
    }

    // Handle commands with arguments
    if (trimmedCmd.startsWith('ping ')) {
      const target = originalCmd.substring(5);
      return `PING ${target}: 56 data bytes
64 bytes from ${target}: icmp_seq=0 ttl=64 time=12.5 ms
64 bytes from ${target}: icmp_seq=1 ttl=64 time=11.8 ms
64 bytes from ${target}: icmp_seq=2 ttl=64 time=10.2 ms
--- ${target} ping statistics ---
3 packets transmitted, 3 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 10.2/11.5/12.5/0.9 ms`;
    }

    if (trimmedCmd.startsWith('echo ')) {
      return originalCmd.substring(5);
    }

    if (trimmedCmd.startsWith('cat ')) {
      const file = originalCmd.substring(4);
      if (file === '/etc/hostname') return config.host;
      if (file === '/etc/os-release') return `PRETTY_NAME="Ubuntu 22.04.3 LTS"
NAME="Ubuntu"
VERSION_ID="22.04"
VERSION="22.04.3 LTS (Jammy Jellyfish)"
VERSION_CODENAME=jammy
ID=ubuntu
ID_LIKE=debian`;
      if (file === '.bashrc' || file === '~/.bashrc') return `# ~/.bashrc: executed by bash(1) for non-login shells.

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

# History settings
HISTCONTROL=ignoreboth
HISTSIZE=1000
HISTFILESIZE=2000

# Aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias grep='grep --color=auto'

# Prompt
PS1='\\u@\\h:\\w\\$ '`;
      return `cat: ${file}: No such file or directory`;
    }

    if (trimmedCmd.startsWith('cd ') || trimmedCmd === 'cd') {
      return ''; // cd doesn't produce output
    }

    if (trimmedCmd.startsWith('mkdir ')) {
      return ''; // mkdir doesn't produce output on success
    }

    if (trimmedCmd.startsWith('touch ')) {
      return ''; // touch doesn't produce output on success
    }

    if (trimmedCmd.startsWith('rm ')) {
      return ''; // rm doesn't produce output on success
    }

    return `bash: ${originalCmd}: command not found`;
  };

  socket.onopen = () => {
    console.log("WebSocket connection opened");
    socket.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket proxy connected. Send connect event with host, port, user, and password.',
      sshAvailable: false
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("Received message:", message.type);

      switch (message.type) {
        case 'connect':
          const { host, port, user, password } = message;
          console.log(`Connection request to ${user}@${host}:${port}`);
          
          connectionConfig = { host, port, user, password };
          
          // Test real TCP connectivity to show if host is reachable
          socket.send(JSON.stringify({
            type: 'status',
            message: `Testando conectividade TCP com ${host}:${port}...`,
            mode: 'testing'
          }));
          
          const tcpResult = await testTCPConnectivity(host, port);
          hostReachable = tcpResult.reachable;
          
          if (tcpResult.reachable) {
            socket.send(JSON.stringify({
              type: 'status',
              message: `✓ Host alcançável via TCP (${tcpResult.latency}ms)`,
              mode: 'reachable'
            }));
          } else {
            socket.send(JSON.stringify({
              type: 'status',
              message: `⚠ Host não alcançável via TCP - usando modo offline`,
              mode: 'unreachable'
            }));
          }
          
          // Always use simulated mode (SSH library not available in Deno Deploy)
          connectionMode = 'simulated';
          isConnected = true;
          
          socket.send(JSON.stringify({
            type: 'session_started',
            message: `Modo simulado - Conectado a ${user}@${host}:${port}`,
            prompt: `${user}@${host}:~$ `,
            mode: 'simulated',
            sshReal: false,
            hostReachable
          }));
          
          // Send welcome message
          const welcomeMessage = `Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-91-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

System information as of ${new Date().toLocaleString()}

  System load:  0.15              Processes:             245
  Usage of /:   47%               Users logged in:       3
  Memory usage: 25%               IPv4 address for eth0: ${host}
  Swap usage:   0%

Last login: ${new Date(Date.now() - 3600000).toLocaleString()} from 192.168.1.100

${hostReachable 
  ? '✓ Host alcançável - Modo simulado (SSH real requer proxy externo)' 
  : '⚠ Host não alcançável - Modo offline simulado'}
Digite 'help' para ver os comandos disponíveis.
`;
          
          socket.send(JSON.stringify({
            type: 'output',
            content: welcomeMessage
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
          console.log(`Processing command: ${cmd} (mode: ${connectionMode})`);
          
          if (cmd.toLowerCase().trim() === 'exit') {
            socket.send(JSON.stringify({
              type: 'disconnected',
              message: 'Conexão encerrada.'
            }));
            isConnected = false;
            connectionConfig = null;
            return;
          }

          // Simulated mode
          const output = processSimulatedCommand(cmd, connectionConfig);
          
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
            message: 'Desconectado do servidor.'
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
