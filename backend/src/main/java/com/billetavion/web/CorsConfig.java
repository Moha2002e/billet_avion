package com.billetavion.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuration web : autorise le front Angular (CORS) et branche le contrôle d'accès.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Value("${app.cors.origins}")
    private String[] origins;
    private final AdminInterceptor adminInterceptor;

    /**
     * Construit la configuration.
     *
     * @param adminInterceptor l'intercepteur de contrôle d'accès
     */
    public CorsConfig(AdminInterceptor adminInterceptor) { this.adminInterceptor = adminInterceptor; }

    /**
     * Autorise le front Angular à appeler l'API (origines configurées).
     *
     * @param registry le registre à configurer
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**").allowedOrigins(origins).allowedMethods("GET", "POST", "PUT", "DELETE");
    }

    /**
     * Branche le contrôle d'accès sur toutes les routes /api.
     *
     * @param registry le registre à configurer
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(adminInterceptor).addPathPatterns("/api/**");
    }
}
