<?php

/** Validaciones de personas (las mismas reglas del formulario, aplicadas ahora también en el servidor). */
class Validar
{
    /** Devuelve [valores normalizados, errores]. $op: sinFecha, sinGenero, sinSalud, tipo (mayor|menor|coach) */
    public static function persona(array $d, string $tipo, array $op = []): array
    {
        $E = [];
        $v = [
            'nombre' => mayus($d['nombre'] ?? ''),
            'apellido_paterno' => mayus($d['apellido_paterno'] ?? ''),
            'apellido_materno' => mayus($d['apellido_materno'] ?? ''),
            'fecha_nacimiento' => trim((string)($d['fecha_nacimiento'] ?? '')),
            'fecha_iso' => null,
            'edad' => '',
            'genero' => (string)($d['genero'] ?? ''),
            'sexo' => (string)($d['sexo'] ?? ''),
            'servicio_medico' => (string)($d['servicio_medico'] ?? ''),
            'enfermedad_cronica' => (string)($d['enfermedad_cronica'] ?? ''),
            'enfermedad_otra' => mayus($d['enfermedad_otra'] ?? ''),
        ];
        foreach ([['nombre', 'Nombre'], ['apellido_paterno', 'Apellido paterno'], ['apellido_materno', 'Apellido materno']] as [$k, $l])
            if (!preg_match(RE_NOMBRE, $v[$k])) $E[$k] = "$l: solo letras en MAYÚSCULAS.";
        if (empty($op['sinFecha'])) {
            $iso = fechaNacimientoIso($v['fecha_nacimiento']);
            if (!$iso) $E['fecha_nacimiento'] = 'Usa el formato DD/MM/AAAA con una fecha real.';
            else {
                $edad = edadDesde($iso);
                $v['edad'] = (string)$edad;
                $v['fecha_iso'] = $iso;
                if ($tipo === 'mayor' && $edad < 18) $E['fecha_nacimiento'] = 'Es menor de edad: regresa y elige “Menor de edad”.';
                if ($tipo === 'menor' && $edad >= 18) $E['fecha_nacimiento'] = 'Es mayor de edad: regresa y elige “Mayor de edad”.';
                if ($tipo === 'coach' && $edad < 18) $E['fecha_nacimiento'] = 'Para trabajar como coach debes ser mayor de edad.';
                if ($edad > 110) $E['fecha_nacimiento'] = 'Revisa el año de nacimiento.';
            }
        }
        if (empty($op['sinGenero'])) {
            if (!in_array($v['genero'], CAT_GENERO, true)) $E['genero'] = 'Selecciona un género.';
            if (!in_array($v['sexo'], CAT_SEXO, true)) $E['sexo'] = 'Selecciona el sexo.';
        }
        if (empty($op['sinSalud'])) {
            if (!in_array($v['servicio_medico'], CAT_SERVICIO, true)) $E['servicio_medico'] = 'Selecciona el servicio médico.';
            if (!in_array($v['enfermedad_cronica'], CAT_ENF, true)) $E['enfermedad_cronica'] = 'Indica si padece alguna enfermedad crónica.';
            if ($v['enfermedad_cronica'] === 'OTRA' && strlen($v['enfermedad_otra']) < 3) $E['enfermedad_otra'] = 'Especifica la enfermedad.';
            if ($v['enfermedad_cronica'] !== 'OTRA') $v['enfermedad_otra'] = '';
            $v['enfermedad_otra'] = recortar($v['enfermedad_otra'], 120);
        }
        return [$v, $E];
    }

    public static function telefono(string $s): string
    {
        return preg_replace('/\D/', '', $s);
    }

    /**
     * Procesa los documentos recibidos. $requeridos: [campo => etiqueta]. $existentes: docs ya guardados [campo => ['ruta','mime','nombre']].
     * Devuelve [docs finales, errores]. Borra del disco los reemplazados o ya innecesarios.
     */
    public static function documentos(array $recibidos, array $requeridos, array $existentes, string $subdir, string $etiquetaFirma): array
    {
        $E = [];
        $docs = $existentes;
        foreach ($requeridos as $campo => $lbl) {
            if (!empty($recibidos[$campo])) {
                try {
                    $nuevo = Almacen::guardar($recibidos[$campo], $subdir);
                    if (isset($docs[$campo])) @unlink(STORAGE_DIR . '/' . $docs[$campo]['ruta']);
                    $docs[$campo] = $nuevo;
                } catch (InvalidArgumentException $e) {
                    $E[$campo] = "$lbl: " . $e->getMessage() . '.';
                }
            } elseif (empty($docs[$campo])) $E[$campo] = "$lbl: adjunta el archivo.";
        }
        foreach (array_keys($docs) as $campo) {                                       // lo que ya no se requiere se descarta
            if ($campo !== 'firma' && !isset($requeridos[$campo])) {
                @unlink(STORAGE_DIR . '/' . $docs[$campo]['ruta']);
                unset($docs[$campo]);
            }
        }
        if (!empty($recibidos['firma'])) {
            try {
                $nuevo = Almacen::guardar($recibidos['firma'], $subdir, true);
                if (isset($docs['firma'])) @unlink(STORAGE_DIR . '/' . $docs['firma']['ruta']);
                $docs['firma'] = $nuevo;
            } catch (InvalidArgumentException $e) {
                $E['firma'] = 'Firma: ' . $e->getMessage() . '.';
            }
        } elseif (empty($docs['firma'])) $E['firma'] = "Falta la $etiquetaFirma.";
        return [$docs, $E];
    }
}

/** Registro de socios con código de recepción: código → tipo → datos → cuenta → verificación de correo. */
class RegistroController
{
    private function contexto(array $auth): array
    {
        $c = Codigo::porId((int)$auth['cid']);
        if (!$c || $c['usado_en'] || $c['expira_en'] < ahora()) fallar('Tu código de registro ya no es válido. Pide uno nuevo en recepción.', 401);
        return [$c, Codigo::pendiente((int)$c['id'])];
    }

    /** POST registro/codigo {codigo} */
    public function codigo(array $p, ?array $auth): void
    {
        $d = entrada();
        $codigo = preg_replace('/\s/', '', (string)($d['codigo'] ?? ''));
        $clave = 'codigo:' . ipCliente();
        if (Seguridad::bloqueado($clave, 5)) fallar('Demasiados códigos inválidos. Espera ' . MINUTOS_BLOQUEO . ' minutos o solicita uno nuevo en recepción.', 429);
        if (!preg_match('/^\d{6}$/', $codigo)) {
            Seguridad::registrar($clave, false);
            fallar('El código debe tener exactamente 6 dígitos (0-9).', 422);
        }
        $c = Codigo::vigente($codigo);
        if (!$c) {
            Seguridad::registrar($clave, false);
            fallar('Código no válido, vencido o ya utilizado. Pide uno nuevo en recepción.', 422);
        }
        Seguridad::registrar($clave, true);
        responder(['registro_token' => Jwt::codificar(['rol' => 'REGISTRO', 'cid' => (int)$c['id']], 45 * 60)]);
    }

    /** GET registro/estado — qué lleva capturado (para volver atrás sin perder datos) */
    public function estado(array $p, ?array $auth): void
    {
        [, $pen] = $this->contexto($auth);
        $docs = [];
        foreach ($pen['docs'] as $k => $f) $docs[$k] = ['nombre' => $f['nombre']];
        responder(['tipo' => $pen['tipo'] ? strtolower($pen['tipo']) : null, 'datos' => $pen['datos'], 'docs' => $docs, 'datos_ok' => !empty($pen['datos']['_ok'])]);
    }

    /** POST registro/tipo {tipo: mayor|menor} */
    public function tipo(array $p, ?array $auth): void
    {
        [$c, $pen] = $this->contexto($auth);
        $t = strtoupper((string)(entrada()['tipo'] ?? ''));
        if (!in_array($t, ['MAYOR', 'MENOR'], true)) fallar('Elige mayor o menor de edad.', 422);
        if ($pen['tipo'] !== $t) {                                   // al cambiar de tipo se descarta lo capturado
            foreach ($pen['docs'] as $f) @unlink(STORAGE_DIR . '/' . $f['ruta']);
            Codigo::guardarPendiente((int)$c['id'], $t, null, []);
        }
        responder(['tipo' => strtolower($t)]);
    }

    /** POST registro/documento {campo, archivo:{nombre,data}} — sube UN documento (así cada petición pesa poco) */
    public function documento(array $p, ?array $auth): void
    {
        [$c, $pen] = $this->contexto($auth);
        $campo = (string)(entrada()['campo'] ?? '');
        $arch = entrada()['archivo'] ?? null;
        if (!in_array($campo, ['id_oficial', 'id_tutor', 'cert_medico', 'firma'], true)) fallar('Documento no válido.', 422);
        try {
            $nuevo = Almacen::guardar($arch, 'pendientes/' . $c['id'], $campo === 'firma');
        } catch (InvalidArgumentException $e) {
            fallar(ucfirst($e->getMessage()) . '.', 422);
        }
        if (isset($pen['docs'][$campo])) @unlink(STORAGE_DIR . '/' . $pen['docs'][$campo]['ruta']);
        $pen['docs'][$campo] = $nuevo;
        Codigo::guardarPendiente((int)$c['id'], $pen['tipo'], $pen['datos'], $pen['docs']);
        responder(['campo' => $campo, 'nombre' => $nuevo['nombre']]);
    }

    /** POST registro/datos — datos del socio (los documentos ya se subieron con registro/documento; también acepta `docs` en línea) */
    public function datos(array $p, ?array $auth): void
    {
        [$c, $pen] = $this->contexto($auth);
        if (!$pen['tipo']) fallar('Primero elige si el socio es mayor o menor de edad.', 409);
        $d = entrada();
        $tipo = strtolower($pen['tipo']);
        $menor = $tipo === 'menor';
        [$v, $E] = Validar::persona($d, $tipo);
        $v['tel_contacto'] = Validar::telefono((string)($d['tel_contacto'] ?? ''));
        $v['tel_emergencia'] = Validar::telefono((string)($d['tel_emergencia'] ?? ''));
        $v['tutor_nombre'] = $menor ? mayus($d['tutor_nombre'] ?? '') : '';
        if ($menor && !preg_match('/^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ \'.-]{4,119}$/u', $v['tutor_nombre'])) $E['tutor_nombre'] = 'Escribe el nombre completo del padre, madre o tutor en MAYÚSCULAS.';
        if (!preg_match('/^\d{10}$/', $v['tel_contacto'])) $E['tel_contacto'] = 'Número de contacto a 10 dígitos.';
        if (!preg_match('/^\d{10}$/', $v['tel_emergencia'])) $E['tel_emergencia'] = 'Número de emergencia a 10 dígitos.';
        elseif ($v['tel_emergencia'] === $v['tel_contacto']) $E['tel_emergencia'] = 'Debe ser distinto al número de contacto.';

        $req = ['id_oficial' => $menor ? 'Identificación del menor' : 'Identificación oficial'];
        if ($menor) $req['id_tutor'] = 'Identificación del padre/tutor';
        if ($v['enfermedad_cronica'] && $v['enfermedad_cronica'] !== 'NINGUNA') $req['cert_medico'] = 'Constancia médica';
        [$docs, $ED] = Validar::documentos(is_array($d['docs'] ?? null) ? $d['docs'] : [], $req, $pen['docs'], 'pendientes/' . $c['id'], $menor ? 'firma electrónica del padre/tutor' : 'firma electrónica');
        $E = array_merge($E, $ED);
        $v['_ok'] = !$E;
        Codigo::guardarPendiente((int)$c['id'], $pen['tipo'], $v, $docs);
        if ($E) fallarCampos($E);
        responder(['usuario_sugerido' => Socio::generarUsuario($v['nombre'], $v['apellido_paterno'], $v['apellido_materno'], $v['fecha_iso'])]);
    }

    /** GET registro/cuenta — usuario que se le asignará*/
    public function cuentaInfo(array $p, ?array $auth): void
    {
        [, $pen] = $this->contexto($auth);
        $v = $pen['datos'];
        if (!$pen['tipo'] || empty($v['_ok'])) fallar('Completa primero los datos del socio.', 409);
        responder(['usuario' => Socio::generarUsuario($v['nombre'], $v['apellido_paterno'], $v['apellido_materno'], $v['fecha_iso']), 'tel_contacto' => $v['tel_contacto']]);
    }

    /** POST registro/cuenta {email, telefono, password, password2} — valida y guarda los datos de acceso, y manda el código al correo.
     *  El socio NO se crea aquí: se crea en finalizar(), cuando el código del correo se confirma. */
    public function cuenta(array $p, ?array $auth): void
    {
        [$c, $pen] = $this->contexto($auth);
        $v = $pen['datos'];
        if (!$pen['tipo'] || empty($v['_ok'])) fallar('Completa primero los datos del socio.', 409);
        $d = entrada(); $E = [];
        $usuario = Socio::generarUsuario($v['nombre'], $v['apellido_paterno'], $v['apellido_materno'], $v['fecha_iso']);
        $email = strtolower(trim((string)($d['email'] ?? ''))); $tel = Validar::telefono((string)($d['telefono'] ?? '')); $pw = (string)($d['password'] ?? '');
        if (!preg_match(RE_EMAIL, $email) || strlen($email) > 160) $E['email'] = 'Escribe un correo válido.'; elseif (Socio::existeCorreo($email)) $E['email'] = 'Ese correo ya está registrado.';
        if (!preg_match('/^\d{10}$/', $tel)) $E['telefono'] = 'El número debe tener 10 dígitos.'; elseif (Socio::existeTelefono($tel)) $E['telefono'] = 'Ese número ya está registrado.';
        $f = erroresPassword($pw);
        if ($f) $E['password'] = 'La contraseña necesita: ' . implode(', ', $f) . '.';
        elseif ($pw !== (string)($d['password2'] ?? '')) $E['password2'] = 'Las contraseñas no coinciden.';
        elseif (stripos($pw, explode('-', $usuario)[0]) !== false) $E['password'] = 'No uses tu nombre de usuario dentro de la contraseña.';
        if ($E) fallarCampos($E);

        Codigo::guardarCuenta((int)$c['id'], ['correo' => $email, 'telefono' => $tel, 'password_hash' => password_hash($pw, PASSWORD_BCRYPT)]);
        $r = Verificacion::enviar('REGISTRO', (int)$c['id'], $email);
        if (!$r['ok']) fallar($r['error'], $r['status'] ?? 429);
        responder(['usuario' => $usuario, 'verif_token' => AuthController::tokenVerificacion('REGISTRO', (int)$c['id'])]);
    }

    /** Crea el socio con lo guardado en registro_pendiente (se llama al confirmar el código del correo). Lanza InvalidArgumentException si ya no se puede. */
    public static function finalizar(int $codigoId): array
    {
        $c = Codigo::porId($codigoId);
        if (!$c || $c['usado_en']) throw new InvalidArgumentException('Ese código de registro ya fue utilizado.');
        $pen = Codigo::pendiente($codigoId); $v = $pen['datos']; $k = $pen['cuenta'];
        if (!$pen['tipo'] || empty($v['_ok']) || !$k) throw new InvalidArgumentException('Tu registro está incompleto. Vuelve a empezar con tu código de recepción.');
        if (Socio::existeCorreo($k['correo'])) throw new InvalidArgumentException('Ese correo ya fue registrado por otra persona. Ingresa tu código de recepción otra vez y usa otro correo.');
        if (Socio::existeTelefono($k['telefono'])) throw new InvalidArgumentException('Ese teléfono ya fue registrado por otra persona. Ingresa tu código de recepción otra vez y usa otro número.');
        $usuario = Socio::generarUsuario($v['nombre'], $v['apellido_paterno'], $v['apellido_materno'], $v['fecha_iso']);
        try {
            return Socio::crear(['usuario' => $usuario, 'correo' => $k['correo'], 'telefono' => $k['telefono'], 'password_hash' => $k['password_hash'], 'tipo' => $pen['tipo'], 'nombre' => $v['nombre'],
                'apellido_paterno' => $v['apellido_paterno'], 'apellido_materno' => $v['apellido_materno'], 'fecha_nacimiento' => $v['fecha_iso'], 'genero' => $v['genero'], 'sexo' => $v['sexo'],
                'tel_contacto' => $v['tel_contacto'], 'tel_emergencia' => $v['tel_emergencia'], 'servicio_medico' => $v['servicio_medico'], 'enfermedad_cronica' => $v['enfermedad_cronica'],
                'enfermedad_otra' => $v['enfermedad_otra'], 'tutor_nombre' => $v['tutor_nombre'], 'codigo_registro' => $c['codigo'], 'correo_verificado_en' => ahora()], $pen['docs'], $codigoId);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') throw new InvalidArgumentException('Alguien más acaba de registrar ese correo, teléfono o usuario. Ingresa tu código de recepción otra vez.');
            throw $e;
        }
    }
}
