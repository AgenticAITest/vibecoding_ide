import fs from 'fs/promises';
import path from 'path';
import type { ScaffoldConfig, ParsedApi } from '@vibecoder/shared';

// Internal config with resolved projectPath
interface InternalConfig extends ScaffoldConfig {
  projectPath: string;
}

async function dir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function write(p: string, content: string): Promise<void> {
  await fs.writeFile(p, content, 'utf-8');
}

// ---------- File generators ----------

function genPackageJson(name: string): string {
  return JSON.stringify({
    name,
    version: '1.0.0',
    main: 'expo-router/entry',
    scripts: {
      start: 'expo start',
      android: 'expo start --android',
      ios: 'expo start --ios',
      web: 'expo start --web',
    },
    dependencies: {
      expo: '~52.0.0',
      'expo-router': '~4.0.0',
      'expo-status-bar': '~2.0.0',
      'expo-linking': '~7.0.0',
      'expo-constants': '~17.0.0',
      react: '18.3.1',
      'react-native': '0.76.6',
      'react-native-safe-area-context': '4.14.1',
      'react-native-screens': '~4.4.0',
      '@react-navigation/native': '^7.0.0',
      '@expo/vector-icons': '^14.0.0',
      'expo-asset': '~11.0.0',
      'react-native-web': '~0.19.13',
      '@expo/metro-runtime': '~4.0.0',
    },
    devDependencies: {
      '@types/react': '~18.3.0',
      typescript: '^5.3.0',
      '@babel/core': '^7.24.0',
    },
  }, null, 2);
}

function genAppJson(name: string, primary: string): string {
  return JSON.stringify({
    expo: {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '1.0.0',
      scheme: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      platforms: ['ios', 'android', 'web'],
      icon: './assets/logo.png',
      splash: {
        backgroundColor: primary,
        resizeMode: 'contain',
      },
      plugins: ['expo-router'],
    },
  }, null, 2);
}

function genTsConfig(): string {
  return JSON.stringify({
    extends: 'expo/tsconfig.base',
    compilerOptions: {
      strict: true,
      paths: { '@/*': ['./src/*'] },
    },
  }, null, 2);
}

function genBabelConfig(): string {
  return `module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
`;
}

function genClaudeMd(config: InternalConfig): string {
  const lines: string[] = [];
  lines.push(`# ${config.projectName}`);
  lines.push('');
  lines.push('## Platform');
  lines.push('');
  lines.push('This is a **React Native mobile app** built with **Expo Router**.');
  lines.push('All UI must use React Native components — never HTML elements.');
  lines.push('');
  lines.push('**Key facts:**');
  lines.push('- Framework: React Native (NOT React web)');
  lines.push('- Navigation: Expo Router (file-based routing in `app/` directory)');
  lines.push('- Target: iOS and Android mobile devices');
  lines.push('- Styling: React Native `StyleSheet` — no CSS files, no className props');
  lines.push('- Layout: `View` + `flexbox` (flexDirection defaults to `column` in RN)');
  lines.push('');
  lines.push('## Quick Start');
  lines.push('');
  lines.push('```bash');
  lines.push('npm install');
  lines.push('npx expo start');
  lines.push('```');
  lines.push('');
  lines.push('## React Native Rules');
  lines.push('');
  lines.push('**ALWAYS use React Native components, NEVER use HTML:**');
  lines.push('- `<View>` not `<div>`');
  lines.push('- `<Text>` not `<p>`, `<span>`, `<h1>`');
  lines.push('- `<Image>` not `<img>`');
  lines.push('- `<TextInput>` not `<input>`');
  lines.push('- `<TouchableOpacity>` or `<Pressable>` not `<button>`');
  lines.push('- `<ScrollView>` or `<FlatList>` not scrollable divs');
  lines.push('');
  lines.push('**Mobile sizing guidelines:**');
  lines.push('- Design for ~375pt wide screens (standard mobile width)');
  lines.push('- Use `padding: 16-20` for screen edges, `gap: 12-16` between elements');
  lines.push('- Touch targets: minimum 44x44pt (Apple HIG)');
  lines.push('- Font sizes: titles 24-28, body 16, captions 12-14');
  lines.push('- Use `flex: 1` for full-screen layouts, not fixed heights');
  lines.push('- Use `ScrollView` when content may exceed screen height');
  lines.push('- All text must be wrapped in `<Text>` — bare strings crash React Native');
  lines.push('');
  lines.push('**Navigation with Expo Router:**');
  lines.push('- Add new screens as files in `app/` directory');
  lines.push('- Tab screens go in `app/(tabs)/`');
  lines.push('- Navigate with `import { router } from "expo-router"` → `router.push("/screen")`');
  lines.push('- Stack screens get automatic back button');
  lines.push('');
  lines.push('**Web compatibility:**');
  lines.push('- Native-only APIs (e.g. `expo-secure-store`) must have web fallbacks');
  lines.push('- Use `Platform.OS === "web"` checks and fall back to `localStorage`, `window.alert`, etc.');
  lines.push('- Test with `npx expo start --web` to catch web-incompatible code');
  lines.push('');
  lines.push('## Design Rules');
  lines.push('');
  lines.push('- Always use the theme system: `import { useTheme } from "@/theme"`');
  lines.push('- Wrap every screen in `<ScreenWrapper>` (provides SafeAreaView + padding)');
  lines.push('- Use themed components: `<Button>`, `<Card>`, `<Input>` from `@/components`');
  lines.push('- Never hardcode colors — always use `theme.colors`');
  lines.push(`- Primary color: ${config.colors.primary}`);
  lines.push(`- Accent color: ${config.colors.accent}`);
  lines.push(`- Background color: ${config.colors.background}`);
  lines.push('');
  lines.push('## Available Components');
  lines.push('');
  lines.push('| Component | Import | Usage |');
  lines.push('|-----------|--------|-------|');
  lines.push('| ScreenWrapper | `@/components/ScreenWrapper` | Wrap every screen (SafeArea + padding) |');
  lines.push('| Button | `@/components/Button` | `<Button title="Label" onPress={fn} variant="primary\|secondary\|outline" />` |');
  lines.push('| Card | `@/components/Card` | Container with border + rounded corners |');
  lines.push('| Input | `@/components/Input` | `<Input label="Username" placeholder="..." value={v} onChangeText={set} />` |');
  lines.push('');

  // Design files reference
  if (config.designFiles.length > 0) {
    lines.push('## Design References');
    lines.push('');
    lines.push('HTML/CSS design files are available in `.vibecoder/designs/`:');
    for (const df of config.designFiles) {
      lines.push(`- \`${df.name}\``);
    }
    lines.push('');
    lines.push('Use these as visual references when building screens.');
    lines.push('Translate HTML/CSS layouts into React Native equivalents (View, Text, StyleSheet).');
    lines.push('');
  }

  if (config.apiSpec) {
    lines.push('## API Reference');
    lines.push('');
    lines.push(`**Base URL:** ${config.apiSpec.baseUrl}`);
    lines.push(`**Auth:** ${config.apiSpec.authType}`);
    lines.push('');
    lines.push('| Method | Path | Summary |');
    lines.push('|--------|------|---------|');
    for (const ep of config.apiSpec.endpoints) {
      lines.push(`| ${ep.method} | ${ep.path} | ${ep.summary || '-'} |`);
    }
    lines.push('');
    lines.push('Full parsed schema: `.vibecoder/api-schema.json`');
    if (config.apiSpecRaw) {
      lines.push('Original spec: `.vibecoder/api-spec-raw.json`');
    }
    lines.push('');
    lines.push('## Building New Screens');
    lines.push('');
    lines.push('For every new screen:');
    lines.push('1. Create a new `.tsx` file in `app/` (or `app/(tabs)/` for tab screens)');
    lines.push('2. Read `.vibecoder/api-schema.json` to find relevant endpoints');
    lines.push('3. Import typed functions from `@/api/endpoints`');
    lines.push('4. Wrap in `<ScreenWrapper>`, use `useTheme()`, and themed components');
    lines.push('5. Use React Native components only — no HTML elements');
  } else {
    lines.push('## API');
    lines.push('');
    lines.push('No API specification was provided during project creation.');
    lines.push('To add one later, place your OpenAPI/Swagger JSON in `.vibecoder/api-spec-raw.json`');
    lines.push('and run the VibeCoder API parser to regenerate `endpoints.ts`.');
  }
  lines.push('');
  return lines.join('\n');
}

function genDesignConfig(config: InternalConfig): string {
  return JSON.stringify({
    primaryColor: config.colors.primary,
    accentColor: config.colors.accent,
    backgroundColor: config.colors.background,
  }, null, 2);
}

function genColors(config: InternalConfig): string {
  return `export const colors = {
  primary: '${config.colors.primary}',
  accent: '${config.colors.accent}',
  background: '${config.colors.background}',
  surface: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
} as const;

export type Colors = typeof colors;
`;
}

function genThemeIndex(): string {
  return `import React, { createContext, useContext } from 'react';
import { colors, Colors } from './colors';

interface Theme {
  colors: Colors;
}

const theme: Theme = { colors };

const ThemeContext = createContext<Theme>(theme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export { colors };
`;
}

function genScreenWrapper(): string {
  return `import React from 'react';
import { SafeAreaView, View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ScreenWrapper({ children, style }: Props) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 20 },
});
`;
}

function genButton(): string {
  return `import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', disabled, style }: Props) {
  const { colors } = useTheme();

  const bg = variant === 'primary' ? colors.accent
    : variant === 'secondary' ? colors.surface
    : 'transparent';

  const fg = variant === 'primary' ? '#FFFFFF'
    : variant === 'secondary' ? colors.text
    : colors.accent;

  const borderColor = variant === 'outline' ? colors.accent : 'transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, { backgroundColor: bg, borderColor, opacity: disabled ? 0.5 : 1 }, style]}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: fg }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
`;
}

function genCard(): string {
  return `import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
});
`;
}

function genInput(): string {
  return `import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '@/theme';

interface Props extends TextInputProps {
  label?: string;
}

export function Input({ label, style, ...props }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
  },
});
`;
}

function genApiClient(config: InternalConfig): string {
  const baseUrl = config.apiSpec ? config.apiSpec.baseUrl : 'https://your-api.example.com';
  const authType = config.apiSpec ? config.apiSpec.authType : 'bearer';

  let authHeader: string;
  if (authType === 'bearer') {
    authHeader = `'Authorization': token ? \`Bearer \${token}\` : ''`;
  } else if (authType === 'basic') {
    authHeader = `'Authorization': token ? \`Basic \${token}\` : ''`;
  } else if (authType === 'apikey') {
    authHeader = `'X-API-Key': token || ''`;
  } else {
    authHeader = `// No auth configured`;
  }

  return `const BASE_URL = '${baseUrl}';

let token: string | null = null;

export function setToken(t: string | null) {
  token = t;
}

export function getToken(): string | null {
  return token;
}

export async function api<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ${authHeader},
  };

  const res = await fetch(\`\${BASE_URL}\${path}\`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(\`API error \${res.status}: \${text}\`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return {} as T;
}
`;
}

function toCamelCase(s: string): string {
  return s.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
}

/** Sanitize schema type names into valid TS identifiers.
 *  e.g. "PageModel«ApprovalDto»" → "any", "User[]" → "any[]" keeps array */
function sanitizeType(raw: string | null): string {
  if (!raw) return 'unknown';
  // Check if it contains non-ASCII or characters invalid in TS type position
  const isArray = raw.endsWith('[]');
  const base = isArray ? raw.slice(0, -2) : raw;
  // Valid TS identifier: letters, digits, underscores, dollar signs
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(base)) {
    // It's a clean identifier but we don't have the actual type defined, use `any`
    return 'any' + (isArray ? '[]' : '');
  }
  // Primitive types pass through
  if (['string', 'number', 'boolean', 'object'].includes(base)) {
    return base + (isArray ? '[]' : '');
  }
  return 'any' + (isArray ? '[]' : '');
}

function genEndpoints(config: InternalConfig): string {
  if (!config.apiSpec || config.apiSpec.endpoints.length === 0) {
    return `// No API specification was provided during project creation.
// Add your API functions here or re-run the VibeCoder wizard with an OpenAPI spec.
//
// Example:
// import { api } from './client';
// export async function getUsers() { return api<User[]>('GET', '/api/users'); }

import { api } from './client';

export {};
`;
  }

  const lines: string[] = [];
  lines.push(`import { api } from './client';`);
  lines.push('');

  for (const ep of config.apiSpec.endpoints) {
    const fnName = toCamelCase(ep.operationId);
    const hasBody = !!ep.requestBody;
    const pathParams = ep.parameters.filter(p => p.in === 'path');
    const queryParams = ep.parameters.filter(p => p.in === 'query');

    // Build function signature params
    const sigParts: string[] = [];
    for (const pp of pathParams) {
      sigParts.push(`${pp.name}: string`);
    }
    if (hasBody) {
      sigParts.push(`body: ${sanitizeType(ep.requestBody)}`);
    }
    if (queryParams.length > 0) {
      sigParts.push(`params?: { ${queryParams.map(q => `${q.name}?: string`).join('; ')} }`);
    }

    const sig = sigParts.join(', ');
    const returnType = sanitizeType(ep.responseType);

    // Build path with interpolation
    let pathExpr = ep.path;
    for (const pp of pathParams) {
      pathExpr = pathExpr.replace(`{${pp.name}}`, `\${${pp.name}}`);
    }

    // Summary as comment
    if (ep.summary) {
      lines.push(`/** ${ep.summary} */`);
    }

    let queryString = '';
    if (queryParams.length > 0) {
      queryString = `
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';`;
      pathExpr += '${qs}';
    }

    lines.push(`export async function ${fnName}(${sig}): Promise<${returnType}> {${queryString}`);
    lines.push(`  return api<${returnType}>('${ep.method}', \`${pathExpr}\`${hasBody ? ', body' : ''});`);
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

function genRootLayout(): string {
  return `import { Stack } from 'expo-router';
import { ThemeProvider } from '@/theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
`;
}

function genIndex(): string {
  return `import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/login" />;
}
`;
}

function genLogin(config: InternalConfig): string {
  let authCall = '';
  if (config.apiSpec) {
    const authEp = config.apiSpec.endpoints.find(ep =>
      ep.tag.toLowerCase().includes('auth') ||
      ep.operationId.toLowerCase().includes('login') ||
      ep.operationId.toLowerCase().includes('signin') ||
      (ep.path.toLowerCase().includes('/auth') && ep.method === 'POST') ||
      (ep.path.toLowerCase().includes('/login') && ep.method === 'POST')
    );
    if (authEp) {
      authCall = `
    // TODO: Wire to ${authEp.method} ${authEp.path}
    // import { ${toCamelCase(authEp.operationId)} } from '@/api/endpoints';
    // const result = await ${toCamelCase(authEp.operationId)}({ username, password });`;
    }
  }

  return `import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }${authCall}

    // Navigate to main app
    router.replace('/(tabs)/dashboard');
  };

  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to continue</Text>

        <View style={styles.form}>
          <Input
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button title="Sign In" onPress={handleLogin} />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 80, height: 80, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 16, marginBottom: 32 },
  form: { width: '100%', maxWidth: 360 },
});
`;
}

function genTabsLayout(): string {
  return `import { Tabs } from 'expo-router';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: () => null }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: () => null }} />
    </Tabs>
  );
}
`;
}

function genDashboard(): string {
  return `import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Card } from '@/components/Card';
import { useTheme } from '@/theme';

export default function DashboardScreen() {
  const { colors } = useTheme();
  return (
    <ScreenWrapper>
      <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
      <Card>
        <Text style={{ color: colors.textSecondary }}>
          Build this page by describing what you want in the chat.
        </Text>
      </Card>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
});
`;
}

function genActivity(): string {
  return `import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Card } from '@/components/Card';
import { useTheme } from '@/theme';

export default function ActivityScreen() {
  const { colors } = useTheme();
  return (
    <ScreenWrapper>
      <Text style={[styles.title, { color: colors.text }]}>Activity</Text>
      <Card>
        <Text style={{ color: colors.textSecondary }}>
          Build this page by describing what you want in the chat.
        </Text>
      </Card>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
});
`;
}

// Minimal valid 1x1 white PNG
function genPlaceholderPng(): Buffer {
  const hex = '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cf00000001010000189dd2f40000000049454e44ae426082';
  return Buffer.from(hex, 'hex');
}

// ---------- Main scaffold function ----------

export async function scaffold(config: ScaffoldConfig, projectPath: string): Promise<void> {
  const root = projectPath;
  const internal: InternalConfig = { ...config, projectPath };

  // Create directories
  await dir(path.join(root, '.vibecoder', 'designs'));
  await dir(path.join(root, 'assets'));
  await dir(path.join(root, 'app', '(tabs)'));
  await dir(path.join(root, 'src', 'api'));
  await dir(path.join(root, 'src', 'theme'));
  await dir(path.join(root, 'src', 'components'));

  // Root config files
  await write(path.join(root, 'package.json'), genPackageJson(config.projectName));
  await write(path.join(root, 'app.json'), genAppJson(config.projectName, config.colors.primary));
  await write(path.join(root, 'tsconfig.json'), genTsConfig());
  await write(path.join(root, 'babel.config.js'), genBabelConfig());
  await write(path.join(root, 'CLAUDE.md'), genClaudeMd(internal));

  // .vibecoder config
  await write(path.join(root, '.vibecoder', 'api-schema.json'), JSON.stringify(config.apiSpec || {}, null, 2));
  await write(path.join(root, '.vibecoder', 'design-config.json'), genDesignConfig(internal));
  if (config.apiSpecRaw) {
    await write(path.join(root, '.vibecoder', 'api-spec-raw.json'), config.apiSpecRaw);
  }

  // Design files (HTML/CSS)
  for (const df of config.designFiles) {
    const decoded = Buffer.from(df.contentBase64, 'base64').toString('utf-8');
    await write(path.join(root, '.vibecoder', 'designs', df.name), decoded);
  }

  // Logo
  if (config.logoBase64) {
    const logoBuffer = Buffer.from(config.logoBase64, 'base64');
    await fs.writeFile(path.join(root, 'assets', 'logo.png'), logoBuffer);
  } else {
    await fs.writeFile(path.join(root, 'assets', 'logo.png'), genPlaceholderPng());
  }

  // Theme
  await write(path.join(root, 'src', 'theme', 'colors.ts'), genColors(internal));
  await write(path.join(root, 'src', 'theme', 'index.tsx'), genThemeIndex());

  // Components
  await write(path.join(root, 'src', 'components', 'ScreenWrapper.tsx'), genScreenWrapper());
  await write(path.join(root, 'src', 'components', 'Button.tsx'), genButton());
  await write(path.join(root, 'src', 'components', 'Card.tsx'), genCard());
  await write(path.join(root, 'src', 'components', 'Input.tsx'), genInput());

  // API
  await write(path.join(root, 'src', 'api', 'client.ts'), genApiClient(internal));
  await write(path.join(root, 'src', 'api', 'endpoints.ts'), genEndpoints(internal));

  // App routes
  await write(path.join(root, 'app', '_layout.tsx'), genRootLayout());
  await write(path.join(root, 'app', 'index.tsx'), genIndex());
  await write(path.join(root, 'app', 'login.tsx'), genLogin(internal));
  await write(path.join(root, 'app', '(tabs)', '_layout.tsx'), genTabsLayout());
  await write(path.join(root, 'app', '(tabs)', 'dashboard.tsx'), genDashboard());
  await write(path.join(root, 'app', '(tabs)', 'activity.tsx'), genActivity());
}
