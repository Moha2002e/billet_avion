package com.billetavion.web;

import com.billetavion.service.AuthService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** Au démarrage : crée le compte administrateur configuré (ADMIN_USERNAME / ADMIN_PASSWORD). */
@Component
public class AdminInit implements ApplicationRunner {
    private final AuthService auth;
    public AdminInit(AuthService auth) { this.auth = auth; }
    @Override public void run(ApplicationArguments args) { auth.initialiserAdmin(); }
}
