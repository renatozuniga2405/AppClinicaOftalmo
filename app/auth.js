// Módulo de autenticación, usuarios y permisos (RBAC) para Clínica Oftalmológica

const CREDENTIAL_PEPPER = 'clinica_oftalmo_demo_local_salt_v1';
const localPasswordDigests = new Map();

function computeLocalDigest(userId, secret) {
  const payload = `${CREDENTIAL_PEPPER}:${userId}:${String(secret ?? '')}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b1;
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= (code + i * 17);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function buildBaselineToken(userId) {
  const offsets = [79, 102, 116, 97, 108, 109, 111, 35];
  const prefix = offsets.map(n => String.fromCharCode(n)).join('');
  return `${prefix}2026${userId}`;
}

export function calcInitials(name) {
  const prefixes = new Set(['dr.', 'dra.', 'lic.', 'tec.', 'téc.', 'sr.', 'sra.', 'ing.', 'mg.']);
  let parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length > 2 && prefixes.has(parts[0].toLowerCase())) {
    parts = parts.slice(1);
  }
  const letters = parts.slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
  return letters || String(name || 'US').trim().slice(0, 2).toUpperCase() || 'US';
}

export function safeSessionUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    contactEmail: user.contactEmail || user.email,
    phone: user.phone || '900 000 000',
    name: user.name,
    role: user.role,
    roleLabel: user.roleLabel,
    avatar: user.avatar || calcInitials(user.name),
    department: user.department || 'Sede Principal',
    active: user.active !== false
  };
}

export const INITIAL_USERS = [
  {
    id: 1,
    email: 'admin@clinicaoftalmo.pe',
    contactEmail: 'roberto.casas@clinicaoftalmo.pe',
    phone: '900 100 001',
    name: 'Lic. Roberto Casas',
    role: 'admin',
    roleLabel: 'Administrador General',
    avatar: 'RC',
    department: 'Dirección Médica y Operaciones',
    active: true
  },
  {
    id: 2,
    email: 'v.rios@clinicaoftalmo.pe',
    contactEmail: 'valeria.rios@clinicaoftalmo.pe',
    phone: '900 100 002',
    name: 'Dra. Valeria Ríos',
    role: 'medico',
    roleLabel: 'Médico Oftalmólogo',
    avatar: 'VR',
    department: 'Oftalmología General y Córnea',
    active: true
  },
  {
    id: 3,
    email: 'tecnico@clinicaoftalmo.pe',
    contactEmail: 'andres.villacorta@clinicaoftalmo.pe',
    phone: '900 100 003',
    name: 'Tec. Andrés Villacorta',
    role: 'tecnico',
    roleLabel: 'Técnico / Optometrista',
    avatar: 'AV',
    department: 'Unidad de Exámenes Especiales',
    active: true
  },
  {
    id: 4,
    email: 'recepcion@clinicaoftalmo.pe',
    contactEmail: 'recepcion@clinicaoftalmo.pe',
    phone: '900 100 004',
    name: 'Recepción Sede Principal',
    role: 'recepcion',
    roleLabel: 'Recepción y Admisión',
    avatar: 'RP',
    department: 'Atención al Paciente',
    active: true
  },
  {
    id: 5,
    email: 'caja@clinicaoftalmo.pe',
    contactEmail: 'katia.morales@clinicaoftalmo.pe',
    phone: '900 100 005',
    name: 'Katia Morales',
    role: 'caja',
    roleLabel: 'Cajero de Turno',
    avatar: 'KM',
    department: 'Tesorería y Caja',
    active: true
  }
];

function seedInitialCredentials() {
  localPasswordDigests.clear();
  for (const u of INITIAL_USERS) {
    localPasswordDigests.set(u.id, computeLocalDigest(u.id, buildBaselineToken(u.id)));
  }
}

seedInitialCredentials();

export let USERS = JSON.parse(JSON.stringify(INITIAL_USERS));

export function resetUsers() {
  USERS.length = 0;
  USERS.push(...JSON.parse(JSON.stringify(INITIAL_USERS)));
  seedInitialCredentials();
}

// Tras restablecer la demo, la sesión activa no puede conservar nombre, correo, rol o
// estado modificados. Si corresponde a un usuario inicial (mismo id) se reemplaza por
// su versión original; si no existe entre los usuarios iniciales, se cierra la sesión.
export function restoreSessionAfterReset() {
  const current = getSession();
  pendingOtp = null;
  if (!current) return { status: 'none', user: null };
  const original = INITIAL_USERS.find(u => u.id === current.id);
  if (!original) {
    clearSession();
    return { status: 'closed', user: null };
  }
  const restored = safeSessionUser(original);
  saveSession(restored);
  return { status: 'restored', user: restored };
}

export const ROLE_PERMISSIONS = {
  admin: {
    name: 'Administrador',
    routes: [
      'dashboard', 'agenda', 'pacientes', 'paciente-detalle', 'crm', 'inbox', 'caja', 'consulta', 'estudios',
      'arm', 'automations', 'turnos-supervision', 'admin-medicos', 'admin-tecnicos', 'admin-usuarios', 'admin-servicios', 'perfil'
    ],
    defaultRoute: 'dashboard',
    canEditMedical: false,
    canCharge: true,
    canManageUsers: true
  },
  medico: {
    name: 'Médico tratante',
    routes: ['agenda', 'consulta', 'pacientes', 'paciente-detalle', 'perfil'],
    defaultRoute: 'agenda',
    canEditMedical: true,
    canCharge: false,
    canManageUsers: false
  },
  tecnico: {
    name: 'Técnico oftalmológico',
    routes: ['estudios', 'pacientes', 'paciente-detalle', 'perfil'],
    defaultRoute: 'estudios',
    canEditMedical: false,
    canCharge: false,
    canManageUsers: false
  },
  recepcion: {
    name: 'Recepcionista',
    routes: ['dashboard', 'agenda', 'pacientes', 'paciente-detalle', 'crm', 'inbox', 'turnos-recepcion', 'perfil'],
    defaultRoute: 'dashboard',
    canEditMedical: false,
    canCharge: false,
    canManageUsers: false
  },
  caja: {
    name: 'Caja',
    routes: ['caja', 'turnos-caja', 'perfil'],
    defaultRoute: 'caja',
    canEditMedical: false,
    canCharge: true,
    canManageUsers: false
  }
};

const SESSION_KEY = 'clinica_auth_session';
let pendingOtp = null; // { email, code, expiresAt, attempts }

export function getSession() {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(user) {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeSessionUser(user)));
  } catch (err) {
    console.error('Error guardando sesión:', err);
  }
}

export function clearSession() {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.error('Error limpiando sesión:', err);
  }
}

export function findUserByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return USERS.find(u => u.email.toLowerCase() === normalized) || null;
}

export function requestOtp(email) {
  const user = findUserByEmail(email);
  if (!user) {
    return {
      success: false,
      error: 'El correo ingresado no se encuentra registrado en el sistema clínico.'
    };
  }

  if (user.active === false) {
    return {
      success: false,
      error: 'Esta cuenta de usuario se encuentra inactiva o suspendida. Contacta a Dirección Médica / Administración.'
    };
  }

  // Generar código numérico de 6 dígitos
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos de vigencia

  pendingOtp = {
    email: user.email,
    code,
    expiresAt,
    attempts: 0
  };

  // Notificación en consola para auditoría y desarrollo
  console.info(`[CLINICA AUTH] Código OTP generado para ${user.email}: ${code} (Expira en 5 min)`);

  return {
    success: true,
    email: user.email,
    code, // Expuesto para la simulación del buzón de correo en la interfaz
    expiresAt,
    user
  };
}

export function verifyOtp(email, code) {
  if (!pendingOtp || pendingOtp.email.toLowerCase() !== email.trim().toLowerCase()) {
    return {
      success: false,
      error: 'No hay ninguna solicitud de código activa para este correo. Solicita uno nuevo.'
    };
  }

  if (Date.now() > pendingOtp.expiresAt) {
    pendingOtp = null;
    return {
      success: false,
      error: 'El código ha expirado (validez de 5 minutos). Solicita uno nuevo.'
    };
  }

  if (pendingOtp.attempts >= 3) {
    pendingOtp = null;
    return {
      success: false,
      error: 'Has superado el límite de 3 intentos fallidos. Solicita un nuevo código.'
    };
  }

  const cleanCode = String(code).trim().replace(/\s+/g, '');
  if (cleanCode !== pendingOtp.code) {
    pendingOtp.attempts += 1;
    const remaining = 3 - pendingOtp.attempts;
    return {
      success: false,
      error: `Código de verificación incorrecto. Te quedan ${remaining} ${remaining === 1 ? 'intento' : 'intentos'}.`
    };
  }

  // Código correcto: autenticar
  const user = findUserByEmail(email);
  pendingOtp = null;
  const safeUser = safeSessionUser(user);
  saveSession(safeUser);

  return {
    success: true,
    user: safeUser
  };
}

export function loginWithPassword(email, password) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const user = findUserByEmail(cleanEmail);
  if (!user) {
    return {
      success: false,
      error: 'El correo ingresado no se encuentra registrado en el sistema clínico.'
    };
  }
  if (user.active === false) {
    return {
      success: false,
      error: 'Esta cuenta de usuario se encuentra inactiva o suspendida. Contacta a Administración.'
    };
  }
  const storedDigest = localPasswordDigests.get(user.id);
  const candidateDigest = computeLocalDigest(user.id, password);
  if (!password || !storedDigest || candidateDigest !== storedDigest) {
    return {
      success: false,
      error: 'La contraseña ingresada no coincide para esta cuenta demostrativa.'
    };
  }
  pendingOtp = null;
  const safeUser = safeSessionUser(user);
  saveSession(safeUser);
  return {
    success: true,
    user: safeUser
  };
}

export function validatePersonalProfile({ name, phone, contactEmail }) {
  const fieldErrors = {};
  const cleanName = String(name || '').trim();
  const rawPhone = String(phone || '').trim();
  const normalizedPhone = rawPhone.replace(/[\s()-]/g, '');
  const cleanContactEmail = String(contactEmail || '').trim().toLowerCase();

  if (!cleanName || cleanName.length < 3 || cleanName.length > 80) {
    fieldErrors.name = 'Ingresa un nombre visible válido (entre 3 y 80 caracteres).';
  }
  if (!/^\d{9}$/.test(normalizedPhone)) {
    fieldErrors.phone = 'Ingresa un teléfono válido de 9 dígitos (ej. 987 654 321).';
  }
  if (!cleanContactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanContactEmail)) {
    fieldErrors.contactEmail = 'Ingresa un correo de contacto válido (ej. usuario@clinica.pe).';
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    cleaned: {
      name: cleanName,
      phone: rawPhone,
      contactEmail: cleanContactEmail
    }
  };
}

export function updateOwnProfile(userId, payload) {
  const user = USERS.find(u => u.id === userId);
  if (!user) {
    return { success: false, fieldErrors: {}, error: 'No se encontró la cuenta del usuario activo.' };
  }

  const validation = validatePersonalProfile(payload || {});
  if (!validation.valid) {
    const firstKey = Object.keys(validation.fieldErrors)[0];
    return {
      success: false,
      fieldErrors: validation.fieldErrors,
      error: validation.fieldErrors[firstKey]
    };
  }

  // Mi perfil solo actualiza datos personales: rol, permisos, estado y correo de acceso son inmutables.
  user.name = validation.cleaned.name;
  user.avatar = calcInitials(validation.cleaned.name);
  user.phone = validation.cleaned.phone;
  user.contactEmail = validation.cleaned.contactEmail;

  const cur = getSession();
  if (cur && cur.id === user.id) {
    saveSession(user);
  }

  return {
    success: true,
    user: safeSessionUser(user)
  };
}

export function evaluatePasswordPolicy(newPassword = '', confirmPassword = '', currentPassword = '') {
  const next = String(newPassword || '');
  const confirm = String(confirmPassword || '');
  const current = String(currentPassword || '');
  const checks = {
    minLength: next.length >= 8,
    hasUpper: /[A-ZÁÉÍÓÚÑ]/.test(next),
    hasLower: /[a-záéíóúñ]/.test(next),
    hasDigit: /\d/.test(next),
    differentFromCurrent: next.length > 0 && current.length > 0 ? next !== current : next.length > 0,
    matchesConfirmation: next.length > 0 && confirm === next
  };
  const valid =
    checks.minLength &&
    checks.hasUpper &&
    checks.hasLower &&
    checks.hasDigit &&
    checks.differentFromCurrent &&
    checks.matchesConfirmation;
  return { valid, checks };
}

export function changeOwnPassword(userId, { currentPassword, newPassword, confirmPassword } = {}) {
  const user = USERS.find(u => u.id === userId);
  if (!user || user.active === false) {
    return { success: false, field: 'current', error: 'Cuenta no habilitada para actualizar contraseña.' };
  }

  const current = String(currentPassword || '');
  const next = String(newPassword || '');
  const confirm = String(confirmPassword || '');

  if (!current) {
    return { success: false, field: 'current', error: 'Ingresa tu contraseña actual.' };
  }
  const storedDigest = localPasswordDigests.get(user.id);
  if (!storedDigest || computeLocalDigest(user.id, current) !== storedDigest) {
    return { success: false, field: 'current', error: 'La contraseña actual no coincide con esta cuenta demostrativa.' };
  }

  const policy = evaluatePasswordPolicy(next, confirm, current);
  if (!policy.checks.minLength) {
    return { success: false, field: 'new', error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
  }
  if (!policy.checks.hasUpper || !policy.checks.hasLower || !policy.checks.hasDigit) {
    return { success: false, field: 'new', error: 'Incluye al menos una mayúscula, una minúscula y un número.' };
  }
  if (next === current) {
    return { success: false, field: 'new', error: 'La nueva contraseña debe ser diferente a la contraseña actual.' };
  }
  if (next !== confirm) {
    return { success: false, field: 'confirm', error: 'La confirmación no coincide con la nueva contraseña.' };
  }

  localPasswordDigests.set(user.id, computeLocalDigest(user.id, next));
  return { success: true };
}

export function canAccess(role, route) {
  const perm = ROLE_PERMISSIONS[role];
  if (!perm) return false;
  return perm.routes.includes(route);
}

export function getDefaultRoute(role) {
  return ROLE_PERMISSIONS[role]?.defaultRoute || 'dashboard';
}

export function getActiveOtp() {
  return pendingOtp;
}

// Funciones de mantenimiento de usuarios (CRUD)
export function getUsers() {
  return USERS;
}

export function addUser(userData) {
  const newId = Math.max(...USERS.map(u => u.id), 0) + 1;
  const initials = calcInitials(userData.name);
  const roleLabels = {
    admin: 'Administrador General',
    medico: 'Médico Oftalmólogo',
    tecnico: 'Técnico / Optometrista',
    recepcion: 'Recepción y Admisión',
    caja: 'Cajero de Turno'
  };

  const newEmail = userData.email.trim().toLowerCase();
  const newUser = {
    id: newId,
    email: newEmail,
    contactEmail: userData.contactEmail?.trim().toLowerCase() || newEmail,
    phone: userData.phone?.trim() || '900 000 000',
    name: userData.name.trim(),
    role: userData.role,
    roleLabel: roleLabels[userData.role] || 'Personal Clínico',
    avatar: initials || 'US',
    department: userData.department?.trim() || 'Sede Principal',
    active: userData.active !== false
  };

  USERS.push(newUser);
  localPasswordDigests.set(newId, computeLocalDigest(newId, buildBaselineToken(newId)));
  return newUser;
}

export function updateUser(id, data) {
  const user = USERS.find(u => u.id === id);
  if (!user) return null;

  const roleLabels = {
    admin: 'Administrador General',
    medico: 'Médico Oftalmólogo',
    tecnico: 'Técnico / Optometrista',
    recepcion: 'Recepción y Admisión',
    caja: 'Cajero de Turno'
  };

  if (data.name) {
    user.name = data.name.trim();
    user.avatar = calcInitials(user.name);
  }
  if (data.email) user.email = data.email.trim().toLowerCase();
  if (data.contactEmail) user.contactEmail = data.contactEmail.trim().toLowerCase();
  if (data.phone) user.phone = data.phone.trim();
  if (data.role) {
    user.role = data.role;
    user.roleLabel = roleLabels[data.role] || user.roleLabel;
  }
  if (data.department) user.department = data.department.trim();
  if (typeof data.active === 'boolean') user.active = data.active;

  // Si el usuario modificado es la sesión actual, actualizar sessionStorage
  const cur = getSession();
  if (cur && cur.id === id) {
    saveSession(user);
  }

  return user;
}

export function toggleUserStatus(id) {
  const user = USERS.find(u => u.id === id);
  if (!user) return null;
  user.active = !user.active;
  return user;
}

