<?php
class PersonalController
{
    /** POST personal/registro — autorregistro de recepción o coach (queda pendiente de aprobación) */
    public function registro(array $p, ?array $auth): void
    {
        $d = entrada(); $puesto = (string)($d['puesto'] ?? '');
        if (!in_array($puesto, ['recepcion', 'coach'], true)) fallar('Puesto no válido.', 422);
        $coach = $puesto === 'coach';
        [$v, $E] = Validar::persona($d, 'coach', ['sinFecha' => !$coach, 'sinGenero' => true, 'sinSalud' => !$coach]);
        $rfc = strtoupper(trim((string)($d['rfc'] ?? ''))); $correo = strtolower(trim((string)($d['email'] ?? '')));
        $tel = Validar::telefono((string)($d['telefono'] ?? '')); $telEm = Validar::telefono((string)($d['telefono_emergencia'] ?? ''));
        if (!preg_match('/^[A-ZÑ&]{4}\d{6}$/u', $rfc)) $E['rfc'] = 'RFC no válido: 4 letras y 6 números, sin homoclave (ej. GOTL900215).'; elseif (Usuario::existeRFC($rfc)) $E['rfc'] = 'Ese RFC ya está registrado.';
        if (!preg_match(RE_EMAIL, $correo) || strlen($correo) > 160) $E['email'] = 'Correo no válido.'; elseif (Usuario::existeCorreo($correo)) $E['email'] = 'Ese correo ya está registrado.';
        if (!preg_match('/^\d{10}$/', $tel)) $E['telefono'] = 'Número a 10 dígitos.';
        if ($coach) { if (!preg_match('/^\d{10}$/', $telEm)) $E['telefono_emergencia'] = 'Número a 10 dígitos.'; elseif ($telEm === $tel) $E['telefono_emergencia'] = 'Debe ser distinto al de contacto.'; }
        $pw = (string)($d['password'] ?? ''); $f = erroresPassword($pw);
        if ($f) $E['password'] = 'La contraseña necesita: ' . implode(', ', $f) . '.'; elseif ($pw !== (string)($d['password2'] ?? '')) $E['password2'] = 'Las contraseñas no coinciden.';

        $req = ['id_oficial' => 'Identificación oficial'];
        if ($coach && $v['enfermedad_cronica'] && $v['enfermedad_cronica'] !== 'NINGUNA') $req['cert_medico'] = 'Constancia médica';
        $tmp = 'pendientes/s-' . bin2hex(random_bytes(6));
        [$docs, $ED] = Validar::documentos(is_array($d['docs'] ?? null) ? $d['docs'] : [], $req, [], $tmp, 'firma electrónica');
        $E = array_merge($E, $ED);
        if ($E) { foreach ($docs as $x) @unlink(STORAGE_DIR . '/' . $x['ruta']); fallarCampos($E); }

        $r = Usuario::crear(['nombre' => trim($v['nombre'] . ' ' . $v['apellido_paterno'] . ' ' . $v['apellido_materno']), 'rfc' => $rfc, 'correo' => $correo, 'password' => $pw,
            'rol' => $coach ? 'COACH' : 'RECEPCION', 'telefono' => $tel, 'tel_emergencia' => $coach ? $telEm : null, 'fecha_nacimiento' => $coach ? $v['fecha_iso'] : null,
            'servicio_medico' => $coach ? $v['servicio_medico'] : null, 'enfermedad_cronica' => $coach ? $v['enfermedad_cronica'] : null,
            'enfermedad_otra' => $coach ? ($v['enfermedad_otra'] ?: null) : null], $docs);
        responder(['numero_empleado' => $r['numero_empleado'], 'verif_token' => AuthController::tokenVerificacion('STAFF', $r['id'])], 201);
    }

    /** GET personal — lista con documentos (administración) */
    public function listar(array $p, ?array $auth): void
    {
        $out = Usuario::listar();
        foreach ($out as &$u) $u['documentos'] = Usuario::documentos($u['id']);
        responder($out);
    }

    /** PUT personal/{id}/estado {estado: ACTIVO|INACTIVO} */
    public function estado(array $p, ?array $auth): void
    {
        $u = Usuario::porId((int)$p['id']);
        if (!$u) fallar('Empleado no encontrado.', 404);
        if ((int)$u['id'] === (int)$auth['sub']) fallar('No puedes cambiar el estado de tu propia cuenta.', 403);
        if ($u['rol'] === 'DUENO') fallar('La cuenta del dueño no se puede modificar.', 403);
        if ($u['rol'] === 'ADMIN' && $auth['rol'] !== 'DUENO') fallar('Solo el dueño puede cambiar cuentas de administración.', 403);
        $estado = strtoupper((string)(entrada()['estado'] ?? ''));
        if (!in_array($estado, ['ACTIVO', 'INACTIVO'], true)) fallar('Estado no válido.', 422);
        if ($estado === 'ACTIVO' && !$u['correo_verificado_en']) fallar('Debe verificar su correo antes de aprobarlo.', 422);
        Usuario::cambiarEstado((int)$u['id'], $estado === 'ACTIVO', (int)$auth['sub']);
        responder(Usuario::vista(Usuario::porId((int)$u['id'])));
    }

    /** GET personal/{id}/documentos/{doc} */
    public function documento(array $p, ?array $auth): void
    {
        $d = Usuario::documento((int)$p['id'], (int)$p['doc']);
        if (!$d) fallar('Documento no encontrado.', 404);
        Almacen::enviar($d['ruta'], $d['mime'], strtolower($d['tipo']) . '-' . $d['staff_id']);
    }

    /** POST personal — el DUEÑO da de alta cuentas ya verificadas y activas (incluida administración) */
    public function crear(array $p, ?array $auth): void
    {
        $d = entrada(); $rol = strtoupper((string)($d['rol'] ?? ''));
        if (!in_array($rol, ['RECEPCION', 'COACH', 'ADMIN'], true)) fallar('Rol no válido.', 422);
        [$v, $E] = Validar::persona($d, 'coach', ['sinFecha' => true, 'sinGenero' => true, 'sinSalud' => true]);
        $rfc = strtoupper(trim((string)($d['rfc'] ?? ''))); $correo = strtolower(trim((string)($d['email'] ?? ''))); $pw = (string)($d['password'] ?? '');
        if (!preg_match('/^[A-ZÑ&]{4}\d{6}$/u', $rfc)) $E['rfc'] = 'RFC no válido: 4 letras y 6 números, sin homoclave.'; elseif (Usuario::existeRFC($rfc)) $E['rfc'] = 'Ese RFC ya está registrado.';
        if (!preg_match(RE_EMAIL, $correo)) $E['email'] = 'Correo no válido.'; elseif (Usuario::existeCorreo($correo)) $E['email'] = 'Ese correo ya está registrado.';
        if ($f = erroresPassword($pw)) $E['password'] = 'La contraseña necesita: ' . implode(', ', $f) . '.';
        if ($E) fallarCampos($E);
        $r = Usuario::crear(['nombre' => trim($v['nombre'] . ' ' . $v['apellido_paterno'] . ' ' . $v['apellido_materno']), 'rfc' => $rfc, 'correo' => $correo, 'password' => $pw,
            'rol' => $rol, 'telefono' => Validar::telefono((string)($d['telefono'] ?? '')) ?: null], [], true);
        responder($r, 201);
    }
}
