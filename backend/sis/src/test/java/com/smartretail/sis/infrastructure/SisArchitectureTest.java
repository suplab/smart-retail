package com.smartretail.sis.infrastructure;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * ArchUnit enforcement of hexagonal architecture layer rules (ADR-008 / CG-01).
 * These tests fail CI if any domain class imports an infrastructure dependency.
 */
@Tag("unit")
class SisArchitectureTest {

    private static final JavaClasses CLASSES = new ClassFileImporter()
            .importPackages("com.smartretail.sis");

    @Test
    void domainMustNotDependOnSpring() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..sis.domain..")
                .should().dependOnClassesThat().resideInAPackage("org.springframework..")
                .because("Domain is pure Java — zero Spring imports (ADR-008)");
        rule.check(CLASSES);
    }

    @Test
    void domainMustNotDependOnAwsSdk() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..sis.domain..")
                .should().dependOnClassesThat().resideInAPackage("software.amazon..")
                .because("Domain must not import AWS SDK — hexagonal architecture (ADR-008 / CG-01)");
        rule.check(CLASSES);
    }

    @Test
    void domainMustNotDependOnInfrastructureAdapters() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..sis.domain..")
                .should().dependOnClassesThat().resideInAPackage("..sis.infrastructure..")
                .because("Domain must not depend on infrastructure — dependency inversion (ADR-008)");
        rule.check(CLASSES);
    }

    @Test
    void applicationServiceMustNotDependOnInfrastructureAdapters() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..sis.application..")
                .should().dependOnClassesThat().resideInAPackage("..sis.infrastructure.adapter..")
                .because("Application services depend on port interfaces, not concrete adapters");
        rule.check(CLASSES);
    }

    @Test
    void infrastructureAdaptersMustNotLeakIntoApplicationLayer() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..sis.application..")
                .should().dependOnClassesThat().resideInAPackage("software.amazon..")
                .because("Application layer must not import AWS SDK directly");
        rule.check(CLASSES);
    }
}
