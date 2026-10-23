import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    model,
    signal,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { capitalise, equipmentPhrases, Exercise, isBuiltIn, MUSCLE_LABELS } from '../../models/exercise';
import { findByName, searchExercises } from '../../models/exercise-links';
import { ExerciseListComponent } from '../../exercises/exercise-list.component';
import { ExerciseStore } from '../../shared/state/exercise-store.service';

/** One row of the list: an exercise to pick, or making a new one from what's typed. */
type PickerOption =
    | { kind: 'exercise'; exercise: Exercise; otherName?: string; hint: string }
    | { kind: 'make'; name: string };

let nextId = 0;

@Component({
    selector: 'app-exercise-picker',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule, ExerciseListComponent],
    templateUrl: './exercise-picker.component.html',
    styleUrl: './exercise-picker.component.scss',
})
export class ExercisePickerComponent implements FormValueControl<string> {
    readonly value = model('');
    readonly exerciseId = model('');
    readonly inputId = input.required<string>();
    readonly placeholder = input('');
    readonly describedBy = input<string>();

    private readonly exercises = inject(ExerciseStore);
    protected readonly listId = `exercise-picker-${nextId++}`;
    protected readonly open = signal(false);
    protected readonly active = signal(-1);
    protected readonly modalOpen = signal(false);
    protected readonly isBuiltIn = isBuiltIn;

    protected readonly options = computed((): PickerOption[] => {
        const typed = this.value().trim();
        const named = findByName(typed, this.exercises.exercises());
        const shown = this.exercises
            .exercises()
            .filter((exercise) => !this.exercises.isHidden(exercise.id) || exercise === named);
        const found: PickerOption[] = searchExercises(typed, shown).map((match) => ({
            kind: 'exercise',
            ...match,
            hint: hint(match.exercise),
        }));
        return typed && !named
            ? [...found, { kind: 'make', name: typed.replace(/\s+/g, ' ') }]
            : found;
    });

    protected readonly expanded = computed(() => this.open() && this.options().length > 0);
    protected readonly activeOptionId = computed(() =>
        this.expanded() && this.active() >= 0 ? this.optionId(this.active()) : null
    );

    protected optionId(index: number): string {
        return `${this.listId}-${index}`;
    }

    protected onInput(event: Event) {
        this.value.set((event.target as HTMLInputElement).value);
        this.exerciseId.set('');
        this.active.set(-1);
        this.open.set(true);
    }

    protected onKeydown(event: KeyboardEvent) {
        const count = this.options().length;
        switch (event.key) {
            case 'ArrowDown':
            case 'ArrowUp': {
                event.preventDefault();
                if (!this.expanded()) {
                    this.open.set(true);
                    this.active.set(event.key === 'ArrowDown' ? 0 : this.options().length - 1);
                    return;
                }
                const by = event.key === 'ArrowDown' ? 1 : -1;
                this.active.update((i) => (i + by + count) % count);
                return;
            }
            case 'Enter': {
                if (this.activeOptionId()) {
                    event.preventDefault();
                    this.choose(this.options()[this.active()]);
                }
                return;
            }
            case 'Escape':
                if (this.expanded()) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.close();
                }
                return;
        }
    }

    protected choose(option: PickerOption) {
        if (option.kind === 'exercise') {
            this.value.set(option.exercise.name);
            this.exerciseId.set(option.exercise.id);
        } else {
            this.value.set(option.name);
            this.exerciseId.set('');
        }
        this.close();
    }

    protected close() {
        this.open.set(false);
        this.active.set(-1);
    }

    protected openModal() {
        this.modalOpen.set(true);
    }

    protected closeModal() {
        this.modalOpen.set(false);
    }

    protected pick(exercise: Exercise) {
        this.value.set(exercise.name);
        this.exerciseId.set(exercise.id);
        this.closeModal();
    }

    protected clearSelection() {
        this.value.set('');
        this.exerciseId.set('');
    }
}

/**
 * What tells one exercise from another at a glance: its main muscles and what it needs,
 * e.g. "Quads, glutes · Barbell, rack". Empty for one of your own with neither yet.
 */
export function hint(exercise: Exercise): string {
    const muscles = exercise.mainMuscles.map((muscle) => MUSCLE_LABELS[muscle].toLowerCase());
    return [muscles.join(', '), equipmentPhrases(exercise.equipment).join(', ')]
        .filter((part) => part !== '')
        .map(capitalise)
        .join(' · ');
}
