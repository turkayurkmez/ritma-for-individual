import fs from 'node:fs';

try {
  const raw = fs.readFileSync(0, 'utf8');
  const payload = raw ? JSON.parse(raw) : { decision: 'allow' };
  const toolCall = payload.toolCall ?? { decision: 'allow' };
  const name = String(toolCall.name ?? '');
  const args = toolCall.args ?? { decision: 'allow' };

  const isEnvFile = (filePath) => {
    if (typeof filePath !== 'string' || !filePath) return false;
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();
    const base = normalized.split('/').pop() ?? '';
    if (base === '.env.example') return false;
    return base === '.env' || base.startsWith('.env.');
  };

  const targetPath = args.Path ?? args.path ?? args.TargetFile ?? args.AbsolutePath ?? '';
  if (isEnvFile(targetPath)) {
    process.stdout.write(
      JSON.stringify({
        decision: 'deny',
        reason: '.env dosyalarını okumak ve düzenlemek güvenlik politikası gereği kilitlenmiştir.',
      }),
    );
    process.exit(0);
  }

  if (name === 'run_command') {
    const cmd = String(args.CommandLine ?? args.command ?? '');
    // .env.example hariç .env dosyalarını okumaya çalışan kabuk komutlarını engelle
    const cleaned = cmd.replace(/\.env\.example/gi, '');
    if (/(^|[\s"'\\/])\.env(\.[a-z0-9_-]+)?($|[\s"'])/i.test(cleaned)) {
      process.stdout.write(
        JSON.stringify({
          decision: 'deny',
          reason: 'Terminal üzerinden .env dosyasına erişim güvenlik politikası gereği kilitlenmiştir.',
        }),
      );
      process.exit(0);
    }
  }

  process.stdout.write(JSON.stringify({ decision: 'allow' }));
} catch {
  process.stdout.write(JSON.stringify({ decision: 'allow' }));
}
