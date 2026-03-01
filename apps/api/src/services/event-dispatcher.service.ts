/**
 * EventDispatcher — Internal domain event pub/sub
 *
 * Design decisions:
 * - Synchronous by default (handlers called in-order)
 * - Each handler failure is isolated (one bad handler won't break others)
 * - No external dependencies (in-process only)
 * - Singleton exported as `eventDispatcher`
 */

import type { DomainEvent, OrderEventType } from "../shared/events.js";

type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void> | void;

export class EventDispatcher {
    private handlers = new Map<string, EventHandler<unknown>[]>();

    /**
     * Register a handler for an event type
     */
    subscribe<T>(type: OrderEventType, handler: EventHandler<T>): void {
        const existing = this.handlers.get(type) ?? [];
        existing.push(handler as EventHandler<unknown>);
        this.handlers.set(type, existing);
        console.log(`[EventDispatcher] Subscribed handler for ${type} (total: ${existing.length})`);
    }

    /**
     * Dispatch an event to all registered handlers.
     * Handler failures are logged but never propagate — they never break
     * the main flow.
     */
    async dispatch<T>(event: DomainEvent<T>): Promise<void> {
        const registeredHandlers = this.handlers.get(event.type) ?? [];

        if (registeredHandlers.length === 0) {
            console.debug(`[EventDispatcher] No handlers for ${event.type}`);
            return;
        }

        console.log(
            `[EventDispatcher] Dispatching ${event.type} (orderId: ${event.orderId}) to ${registeredHandlers.length} handler(s)`
        );

        for (const handler of registeredHandlers) {
            try {
                await handler(event as DomainEvent<unknown>);
            } catch (error) {
                // Isolated failure — log and continue with remaining handlers
                console.error(
                    `[EventDispatcher] Handler for ${event.type} threw an error:`,
                    error
                );
            }
        }
    }

    /**
     * Clear all handlers (useful for testing)
     */
    clear(): void {
        this.handlers.clear();
    }
}

// Singleton
export const eventDispatcher = new EventDispatcher();
