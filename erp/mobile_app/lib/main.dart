import 'package:flutter/material.dart';
import 'app_config.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AnviMitraApp());
}

class AnviMitraApp extends StatelessWidget {
  const AnviMitraApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF172B55),
          primary: const Color(0xFF172B55),
          secondary: const Color(0xFF0D9488),
        ),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: 'superadmin@anvimitra.com');
  final _passwordController = TextEditingController(text: 'SuperAdmin@123');
  final _schoolCodeController = TextEditingController();
  String _selectedRole = 'super_admin';
  bool _isLoading = false;
  String? _errorMessage;

  final List<Map<String, String>> _roles = [
    {'id': 'super_admin', 'label': 'Super Admin (Platform)'},
    {'id': 'admin', 'label': 'Admin / Office'},
    {'id': 'principal', 'label': 'Principal'},
    {'id': 'teacher', 'label': 'Teacher'},
    {'id': 'accountant', 'label': 'Accountant'},
    {'id': 'parent', 'label': 'Parent'},
    {'id': 'student', 'label': 'Student'},
  ];

  void _signIn() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    // In native webview bridge or HTTP mode:
    await Future.delayed(const Duration(milliseconds: 600));
    if (mounted) {
      setState(() => _isLoading = false);
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => RoleDashboardScreen(role: _selectedRole, email: _emailController.text),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSuper = _selectedRole == 'super_admin';

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FB),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Card(
            elevation: 4,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(Icons.school, size: 54, color: Color(0xFF172B55)),
                    const SizedBox(height: 12),
                    const Text(
                      AppConfig.appName,
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    const Text(
                      'Multi-School Management Portal',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: Colors.black54),
                    ),
                    const SizedBox(height: 24),
                    DropdownButtonFormField<String>(
                      value: _selectedRole,
                      decoration: const InputDecoration(labelText: 'Role', border: OutlineInputBorder()),
                      items: _roles.map((r) => DropdownMenuItem(value: r['id'], child: Text(r['label']!))).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedRole = val;
                            if (val == 'super_admin') {
                              _emailController.text = 'superadmin@anvimitra.com';
                              _passwordController.text = 'SuperAdmin@123';
                            }
                          });
                        }
                      },
                    ),
                    if (!isSuper) ...[
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _schoolCodeController,
                        decoration: const InputDecoration(labelText: 'School Code', border: OutlineInputBorder()),
                        validator: (v) => !isSuper && (v == null || v.isEmpty) ? 'Required' : null,
                      ),
                    ],
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(labelText: 'Email / Phone', border: OutlineInputBorder()),
                      validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder()),
                      validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF172B55),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _isLoading ? null : _signIn,
                      child: _isLoading
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Sign In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 12),
                      Text(_errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                    ]
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class RoleDashboardScreen extends StatelessWidget {
  final String role;
  final String email;

  const RoleDashboardScreen({Key? key, required this.role, required this.email}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${role.toUpperCase()} Dashboard'),
        backgroundColor: const Color(0xFF172B55),
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle, size: 64, color: Colors.green),
              const SizedBox(height: 16),
              Text('Logged in as: $email', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              Text('Role: $role', style: const TextStyle(fontSize: 14, color: Colors.grey)),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                ),
                child: const Text('Sign Out'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
