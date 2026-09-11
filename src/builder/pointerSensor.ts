import type { PointerEvent } from 'react';
import { PointerSensor } from '@dnd-kit/core';

/** Ignore chrome controls so lock/delete clicks do not start a drag. */
export class BuilderPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: PointerEvent) => {
        if (!event.isPrimary || event.button !== 0) return false;
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-dnd-ignore="true"]')) return false;
        return true;
      },
    },
  ];
}
