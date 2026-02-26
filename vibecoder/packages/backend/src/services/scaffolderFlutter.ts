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

// ---------- Utilities ----------

/** Convert CSS hex (#RRGGBB or RRGGBB) to Dart Color literal (0xFFRRGGBB) */
function cssHexToDart(hex: string): string {
  const clean = hex.replace('#', '').toUpperCase();
  return `0xFF${clean}`;
}

/** Convert project name to valid Dart package name (lowercase snake_case) */
function toSnakeCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

function toCamelCase(s: string): string {
  return s.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
}

// ---------- File generators ----------

function genPubspecYaml(name: string): string {
  const dartName = toSnakeCase(name);
  return `name: ${dartName}
description: A new Flutter project created with VibeCoder IDE.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: ^3.5.0

dependencies:
  flutter:
    sdk: flutter
  go_router: ^14.0.0
  http: ^1.2.0
  provider: ^6.1.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^5.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/logo.png
`;
}

function genAnalysisOptions(): string {
  return `include: package:flutter_lints/flutter.yaml

linter:
  rules:
    prefer_const_constructors: false
    prefer_const_literals_to_create_immutables: false
`;
}

function genClaudeMd(config: InternalConfig): string {
  const lines: string[] = [];
  lines.push(`# ${config.projectName}`);
  lines.push('');
  lines.push('## Platform');
  lines.push('');
  lines.push('This is a **Flutter mobile app** built with **Dart** and **Material Design**.');
  lines.push('All UI must use Flutter widgets — never HTML elements.');
  lines.push('');
  lines.push('**Key facts:**');
  lines.push('- Framework: Flutter (NOT React Native, NOT web)');
  lines.push('- Language: Dart');
  lines.push('- Navigation: GoRouter (declarative routing in `lib/main.dart`)');
  lines.push('- State management: Provider (ChangeNotifier pattern)');
  lines.push('- Target: iOS and Android mobile devices');
  lines.push('- Styling: Widget properties and ThemeData — no CSS files');
  lines.push('- Layout: Column, Row, Stack, Expanded, Flexible (flexbox-like)');
  lines.push('');
  lines.push('## Quick Start');
  lines.push('');
  lines.push('```bash');
  lines.push('flutter pub get');
  lines.push('flutter run');
  lines.push('```');
  lines.push('');
  lines.push('## Dart & Flutter Rules');
  lines.push('');
  lines.push('**ALWAYS use Flutter widgets, NEVER use HTML:**');
  lines.push('- `Scaffold` + `SafeArea` for screen structure (use `ScreenWrapper`)');
  lines.push('- `Column` / `Row` for vertical/horizontal layout (like flexbox)');
  lines.push('- `Text` for text content — never bare strings');
  lines.push('- `Image.asset()` / `Image.network()` for images');
  lines.push('- `TextFormField` for text input (use `AppInput`)');
  lines.push('- `ElevatedButton` / `OutlinedButton` for buttons (use `AppButton`)');
  lines.push('- `ListView` / `ListView.builder` for scrollable lists');
  lines.push('- `Container` / `DecoratedBox` for styled boxes');
  lines.push('- `SizedBox` for spacing (prefer over `Padding` for simple gaps)');
  lines.push('');
  lines.push('**Mobile sizing guidelines:**');
  lines.push('- Design for ~375 logical pixel wide screens');
  lines.push('- Use `EdgeInsets.all(16-20)` for screen padding');
  lines.push('- Touch targets: minimum 48x48 (Material Design)');
  lines.push('- Font sizes: titles 24-28, body 16, captions 12-14');
  lines.push('- Use `Expanded` / `Flexible` for responsive layouts');
  lines.push('- Use `SingleChildScrollView` when content may exceed screen');
  lines.push('');
  lines.push('**Navigation with GoRouter:**');
  lines.push('- Routes are defined in `lib/main.dart` GoRouter configuration');
  lines.push('- Navigate: `context.go(\'/path\')` to replace, `context.push(\'/path\')` to push');
  lines.push('- Tab navigation uses `ShellRoute` with `BottomNavigationBar`');
  lines.push('- Add new routes to the GoRouter config in `main.dart`');
  lines.push('- Import: `import \'package:go_router/go_router.dart\';`');
  lines.push('');
  lines.push('**State management with Provider:**');
  lines.push('- Define state classes extending `ChangeNotifier`');
  lines.push('- Wrap app or subtree with `ChangeNotifierProvider`');
  lines.push('- Read state: `context.watch<MyState>()` (rebuilds on change)');
  lines.push('- Read without rebuild: `context.read<MyState>()`');
  lines.push('');
  lines.push('## Design Rules');
  lines.push('');
  lines.push('- Always use the app theme: `Theme.of(context)`');
  lines.push('- Wrap every screen in `ScreenWrapper` (provides Scaffold + SafeArea + padding)');
  lines.push('- Use themed widgets: `AppButton`, `AppCard`, `AppInput` from `lib/widgets/`');
  lines.push('- Never hardcode colors — use `AppColors` from `lib/theme/colors.dart`');
  lines.push(`- Primary color: ${config.colors.primary}`);
  lines.push(`- Accent color: ${config.colors.accent}`);
  lines.push(`- Background color: ${config.colors.background}`);
  lines.push('');
  lines.push('## Available Widgets');
  lines.push('');
  lines.push('| Widget | Import | Usage |');
  lines.push('|--------|--------|-------|');
  lines.push('| ScreenWrapper | `widgets/screen_wrapper.dart` | Wrap every screen (Scaffold + SafeArea + padding) |');
  lines.push('| AppButton | `widgets/app_button.dart` | `AppButton(label: \'Text\', onPressed: fn, variant: AppButtonVariant.primary)` |');
  lines.push('| AppCard | `widgets/app_card.dart` | Container with themed border + rounded corners |');
  lines.push('| AppInput | `widgets/app_input.dart` | `AppInput(label: \'Email\', controller: ctrl)` |');
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
    lines.push('Translate HTML/CSS layouts into Flutter widget equivalents (Column, Row, Container, etc.).');
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
    lines.push('1. Create a new `.dart` file in `lib/screens/`');
    lines.push('2. Add a route to the GoRouter config in `lib/main.dart`');
    lines.push('3. Read `.vibecoder/api-schema.json` to find relevant endpoints');
    lines.push('4. Import functions from `lib/api/endpoints.dart`');
    lines.push('5. Wrap in `ScreenWrapper`, use `Theme.of(context)`, and themed widgets');
    lines.push('6. Use Flutter widgets only — no HTML elements');
  } else {
    lines.push('## API');
    lines.push('');
    lines.push('No API specification was provided during project creation.');
    lines.push('To add one later, place your OpenAPI/Swagger JSON in `.vibecoder/api-spec-raw.json`');
    lines.push('and run the VibeCoder API parser to regenerate `endpoints.dart`.');
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
  return `import 'package:flutter/material.dart';

abstract class AppColors {
  static const Color primary = Color(${cssHexToDart(config.colors.primary)});
  static const Color accent = Color(${cssHexToDart(config.colors.accent)});
  static const Color background = Color(${cssHexToDart(config.colors.background)});
  static const Color surface = Color(0xFFFFFFFF);
  static const Color text = Color(0xFF1F2937);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color border = Color(0xFFE5E7EB);
  static const Color error = Color(0xFFEF4444);
  static const Color success = Color(0xFF10B981);
}
`;
}

function genTheme(): string {
  return `import 'package:flutter/material.dart';
import 'colors.dart';

final ThemeData appTheme = ThemeData(
  colorScheme: ColorScheme.light(
    primary: AppColors.primary,
    secondary: AppColors.accent,
    surface: AppColors.surface,
    error: AppColors.error,
  ),
  scaffoldBackgroundColor: AppColors.background,
  appBarTheme: const AppBarTheme(
    backgroundColor: Colors.transparent,
    elevation: 0,
    foregroundColor: AppColors.text,
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: AppColors.surface,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: AppColors.border),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: AppColors.border),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
    ),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: AppColors.accent,
      foregroundColor: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
    ),
  ),
  cardTheme: CardTheme(
    color: AppColors.surface,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
      side: const BorderSide(color: AppColors.border),
    ),
  ),
);
`;
}

function genMain(config: InternalConfig): string {
  const dartName = toSnakeCase(config.projectName);
  return `import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'theme/theme.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/activity_screen.dart';

void main() {
  runApp(const MyApp());
}

/// Simple auth state — replace with your own logic.
class AuthState extends ChangeNotifier {
  bool _isLoggedIn = false;
  bool get isLoggedIn => _isLoggedIn;

  void login() {
    _isLoggedIn = true;
    notifyListeners();
  }

  void logout() {
    _isLoggedIn = false;
    notifyListeners();
  }
}

final GoRouter _router = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    ShellRoute(
      builder: (context, state, child) => _ShellScreen(child: child),
      routes: [
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardScreen(),
        ),
        GoRoute(
          path: '/activity',
          builder: (context, state) => const ActivityScreen(),
        ),
      ],
    ),
  ],
);

class _ShellScreen extends StatefulWidget {
  final Widget child;
  const _ShellScreen({required this.child});

  @override
  State<_ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<_ShellScreen> {
  int _currentIndex = 0;

  static const _tabs = ['/dashboard', '/activity'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: widget.child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() => _currentIndex = index);
          context.go(_tabs[index]);
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.timeline_outlined),
            activeIcon: Icon(Icons.timeline),
            label: 'Activity',
          ),
        ],
      ),
    );
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthState(),
      child: MaterialApp.router(
        title: '${config.projectName}',
        theme: appTheme,
        routerConfig: _router,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
`;
}

function genLoginScreen(config: InternalConfig): string {
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
    // import '../api/endpoints.dart';
    // final result = await ${toCamelCase(authEp.operationId)}(...);`;
    }
  }

  return `import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/colors.dart';
import '../widgets/screen_wrapper.dart';
import '../widgets/app_button.dart';
import '../widgets/app_input.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() {
    if (!_formKey.currentState!.validate()) return;
${authCall}

    // Navigate to main app
    context.go('/dashboard');
  }

  @override
  Widget build(BuildContext context) {
    return ScreenWrapper(
      child: Center(
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  'assets/logo.png',
                  width: 80,
                  height: 80,
                ),
                const SizedBox(height: 24),
                Text(
                  'Welcome Back',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Sign in to continue',
                  style: TextStyle(
                    fontSize: 16,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 32),
                AppInput(
                  label: 'Email',
                  hint: 'Enter your email',
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your email';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 4),
                AppInput(
                  label: 'Password',
                  hint: 'Enter your password',
                  controller: _passwordController,
                  obscureText: true,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your password';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: AppButton(
                    label: 'Sign In',
                    onPressed: _handleLogin,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
`;
}

function genDashboardScreen(): string {
  return `import 'package:flutter/material.dart';
import '../theme/colors.dart';
import '../widgets/screen_wrapper.dart';
import '../widgets/app_card.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ScreenWrapper(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Dashboard',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 16),
          AppCard(
            child: Text(
              'Build this page by describing what you want in the chat.',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}
`;
}

function genActivityScreen(): string {
  return `import 'package:flutter/material.dart';
import '../theme/colors.dart';
import '../widgets/screen_wrapper.dart';
import '../widgets/app_card.dart';

class ActivityScreen extends StatelessWidget {
  const ActivityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ScreenWrapper(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Activity',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 16),
          AppCard(
            child: Text(
              'Build this page by describing what you want in the chat.',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}
`;
}

function genScreenWrapper(): string {
  return `import 'package:flutter/material.dart';

class ScreenWrapper extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;

  const ScreenWrapper({
    super.key,
    required this.child,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: padding ?? const EdgeInsets.all(20),
          child: child,
        ),
      ),
    );
  }
}
`;
}

function genAppButton(): string {
  return `import 'package:flutter/material.dart';
import '../theme/colors.dart';

enum AppButtonVariant { primary, secondary, outline }

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final bool loading;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    switch (variant) {
      case AppButtonVariant.primary:
        return ElevatedButton(
          onPressed: loading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.accent,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _buildChild(Colors.white),
        );
      case AppButtonVariant.secondary:
        return ElevatedButton(
          onPressed: loading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.surface,
            foregroundColor: AppColors.text,
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0,
          ),
          child: _buildChild(AppColors.text),
        );
      case AppButtonVariant.outline:
        return OutlinedButton(
          onPressed: loading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.accent,
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            side: const BorderSide(color: AppColors.accent, width: 1.5),
          ),
          child: _buildChild(AppColors.accent),
        );
    }
  }

  Widget _buildChild(Color color) {
    if (loading) {
      return SizedBox(
        height: 20,
        width: 20,
        child: CircularProgressIndicator(strokeWidth: 2, color: color),
      );
    }
    return Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600));
  }
}
`;
}

function genAppCard(): string {
  return `import 'package:flutter/material.dart';
import '../theme/colors.dart';

class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;

  const AppCard({
    super.key,
    required this.child,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: child,
    );
  }
}
`;
}

function genAppInput(): string {
  return `import 'package:flutter/material.dart';
import '../theme/colors.dart';

class AppInput extends StatelessWidget {
  final String? label;
  final String? hint;
  final TextEditingController? controller;
  final bool obscureText;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;
  final ValueChanged<String>? onChanged;

  const AppInput({
    super.key,
    this.label,
    this.hint,
    this.controller,
    this.obscureText = false,
    this.keyboardType,
    this.validator,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
        ],
        TextFormField(
          controller: controller,
          obscureText: obscureText,
          keyboardType: keyboardType,
          validator: validator,
          onChanged: onChanged,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: AppColors.textSecondary),
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}
`;
}

function genApiClient(config: InternalConfig): string {
  const baseUrl = config.apiSpec ? config.apiSpec.baseUrl : 'https://your-api.example.com';
  const authType = config.apiSpec ? config.apiSpec.authType : 'bearer';

  let authHeader: string;
  if (authType === 'bearer') {
    authHeader = `if (_token != null) headers['Authorization'] = 'Bearer $_token';`;
  } else if (authType === 'basic') {
    authHeader = `if (_token != null) headers['Authorization'] = 'Basic $_token';`;
  } else if (authType === 'apikey') {
    authHeader = `if (_token != null) headers['X-API-Key'] = _token!;`;
  } else {
    authHeader = `// No auth configured`;
  }

  return `import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  static const String baseUrl = '${baseUrl}';
  static String? _token;

  static void setToken(String? token) => _token = token;
  static String? getToken() => _token;

  static Future<Map<String, dynamic>> api(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('\$baseUrl\$path');
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    ${authHeader}

    late http.Response response;

    switch (method.toUpperCase()) {
      case 'GET':
        response = await http.get(uri, headers: headers);
        break;
      case 'POST':
        response = await http.post(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
        break;
      case 'PUT':
        response = await http.put(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
        break;
      case 'PATCH':
        response = await http.patch(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
        break;
      case 'DELETE':
        response = await http.delete(uri, headers: headers);
        break;
      default:
        throw Exception('Unsupported HTTP method: \$method');
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('API error \${response.statusCode}: \${response.body}');
    }

    if (response.body.isEmpty) return {};

    return jsonDecode(response.body) as Map<String, dynamic>;
  }
}
`;
}

function genEndpoints(config: InternalConfig): string {
  if (!config.apiSpec || config.apiSpec.endpoints.length === 0) {
    return `// No API specification was provided during project creation.
// Add your API functions here or re-run the VibeCoder wizard with an OpenAPI spec.
//
// Example:
// import 'client.dart';
// Future<Map<String, dynamic>> getUsers() async {
//   return ApiClient.api('GET', '/api/users');
// }

import 'client.dart';
`;
  }

  const lines: string[] = [];
  lines.push(`import 'client.dart';`);
  lines.push('');

  for (const ep of config.apiSpec.endpoints) {
    const fnName = toCamelCase(ep.operationId);
    const hasBody = !!ep.requestBody;
    const pathParams = ep.parameters.filter(p => p.in === 'path');
    const queryParams = ep.parameters.filter(p => p.in === 'query');

    // Build function signature params
    const sigParts: string[] = [];
    for (const pp of pathParams) {
      sigParts.push(`String ${pp.name}`);
    }
    if (hasBody) {
      sigParts.push(`Map<String, dynamic> body`);
    }
    if (queryParams.length > 0) {
      for (const qp of queryParams) {
        sigParts.push(`String? ${qp.name}`);
      }
    }

    // Build path with interpolation
    let pathExpr = ep.path;
    for (const pp of pathParams) {
      pathExpr = pathExpr.replace(`{${pp.name}}`, `\$${pp.name}`);
    }

    // Summary as comment
    if (ep.summary) {
      lines.push(`/// ${ep.summary}`);
    }

    // Build query string if needed
    let querySetup = '';
    if (queryParams.length > 0) {
      const qpEntries = queryParams.map(qp =>
        `if (${qp.name} != null) '${qp.name}': ${qp.name}!`
      ).join(', ');
      querySetup = `
  final queryParams = <String, String>{${qpEntries}};
  final qs = queryParams.isNotEmpty ? '?\${Uri(queryParameters: queryParams).query}' : '';`;
      pathExpr += '\$qs';
    }

    const sig = sigParts.length > 0 ? `{${sigParts.map(s => `required ${s}`).join(', ')}}` : '';

    lines.push(`Future<Map<String, dynamic>> ${fnName}(${sig}) async {${querySetup}`);
    lines.push(`  return ApiClient.api('${ep.method}', '${pathExpr}'${hasBody ? ', body: body' : ''});`);
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

// Minimal valid 1x1 white PNG
function genPlaceholderPng(): Buffer {
  const hex = '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cf00000001010000189dd2f40000000049454e44ae426082';
  return Buffer.from(hex, 'hex');
}

// ---------- Main scaffold function ----------

export async function scaffoldFlutter(config: ScaffoldConfig, projectPath: string): Promise<void> {
  const root = projectPath;
  const internal: InternalConfig = { ...config, projectPath };

  // Create directories
  await dir(path.join(root, '.vibecoder', 'designs'));
  await dir(path.join(root, 'assets'));
  await dir(path.join(root, 'lib', 'theme'));
  await dir(path.join(root, 'lib', 'screens'));
  await dir(path.join(root, 'lib', 'widgets'));
  await dir(path.join(root, 'lib', 'api'));

  // Root config files
  await write(path.join(root, 'pubspec.yaml'), genPubspecYaml(config.projectName));
  await write(path.join(root, 'analysis_options.yaml'), genAnalysisOptions());
  await write(path.join(root, 'CLAUDE.md'), genClaudeMd(internal));

  // .vibecoder config (identical to Expo)
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
  await write(path.join(root, 'lib', 'theme', 'colors.dart'), genColors(internal));
  await write(path.join(root, 'lib', 'theme', 'theme.dart'), genTheme());

  // Entry point
  await write(path.join(root, 'lib', 'main.dart'), genMain(internal));

  // Screens
  await write(path.join(root, 'lib', 'screens', 'login_screen.dart'), genLoginScreen(internal));
  await write(path.join(root, 'lib', 'screens', 'dashboard_screen.dart'), genDashboardScreen());
  await write(path.join(root, 'lib', 'screens', 'activity_screen.dart'), genActivityScreen());

  // Widgets
  await write(path.join(root, 'lib', 'widgets', 'screen_wrapper.dart'), genScreenWrapper());
  await write(path.join(root, 'lib', 'widgets', 'app_button.dart'), genAppButton());
  await write(path.join(root, 'lib', 'widgets', 'app_card.dart'), genAppCard());
  await write(path.join(root, 'lib', 'widgets', 'app_input.dart'), genAppInput());

  // API
  await write(path.join(root, 'lib', 'api', 'client.dart'), genApiClient(internal));
  await write(path.join(root, 'lib', 'api', 'endpoints.dart'), genEndpoints(internal));
}
