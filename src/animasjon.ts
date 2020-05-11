import { trigger, transition, query, style, stagger, group, animate } from '@angular/animations';

export const filListeAnim = trigger('filListe', [
    /* Animasjon */
    transition(':enter', [
        query(':self', [
            style({ opacity: '0', transform: 'translateY(-10px)' }),
            animate('500ms ease')
        ], { optional: true })
    ]),
    transition(':leave', [
        query(':self', [
            animate('200ms ease', style({ opacity: '0', transform: 'translateY(10px)' }))
        ], { optional: true })
    ])
]);

export const feilMelding = trigger('feilMelding', [
    /* Animasjon */
    transition(':enter', [
        style({
            opacity: '0',
            transform: 'translateY(-100%) scale(0)'
        }),
        animate('300ms ease-in')
    ])
]);

/* stagger(50, group([
                animate('250ms 300ms ease-in'),
                query('>div', [
                    style({
                        opacity: '1',
                        transform: 'translateX(0) scale(1)'
                    }),
                    animate('500ms 500ms ease-out')
                ])
            ])) */
