import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExercisePickerComponent } from './exercise-picker.component';

@Component({
    imports: [ExercisePickerComponent],
    template: `
        <app-exercise-picker
            inputId="name"
            [(value)]="name"
            [(exerciseId)]="exerciseId"
            placeholder="e.g. Push-ups"
        />
    `,
})
class HostComponent {
    readonly name = signal('');
    readonly exerciseId = signal('');
}

describe('ExercisePickerComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    beforeEach(async () => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        TestBed.configureTestingModule({
            providers: [provideRouter([])],
        });
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    afterEach(() => localStorage.clear());

    const addButton = () =>
        fixture.nativeElement.querySelector('button[aria-label="Add exercise"]') as HTMLButtonElement;
    const modal = () => fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement | null;
    const modalOptions = () =>
        Array.from(fixture.nativeElement.querySelectorAll('[data-exercise-option]')) as HTMLElement[];

    it('opens a modal with the exercises list when the add button is clicked', async () => {
        expect(addButton()).not.toBeNull();

        addButton().click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(modal()).not.toBeNull();
        expect(modal()!.querySelector('input[type="search"]')).not.toBeNull();
    });

    it('searches and adds an exercise, then closes the modal', async () => {
        addButton().click();
        fixture.detectChanges();
        await fixture.whenStable();

        const search = modal()!.querySelector('input[type="search"]') as HTMLInputElement;
        search.value = 'dead';
        search.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        await fixture.whenStable();

        const deadlift = modalOptions().find((option) =>
            option.textContent?.includes('Deadlift')
        );
        expect(deadlift).toBeTruthy();

        (deadlift!.querySelector('[data-add-exercise]') as HTMLButtonElement).click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(host.name()).toBe('Deadlift');
        expect(host.exerciseId()).toBe('builtin:deadlift');
        expect(modal()).toBeNull();
    });

    it('lets the user clear a selected exercise', async () => {
        host.name.set('Push-up');
        host.exerciseId.set('builtin:push-up');
        fixture.detectChanges();
        await fixture.whenStable();

        const clear = fixture.nativeElement.querySelector(
            'button[aria-label="Clear selected exercise"]'
        ) as HTMLButtonElement;
        clear.click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(host.name()).toBe('');
        expect(host.exerciseId()).toBe('');
    });
});
