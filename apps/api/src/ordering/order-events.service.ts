import { Injectable } from "@nestjs/common";
import { filter, map, Observable, Subject } from "rxjs";
import type { OrderEvent } from "@kutana/shared/ordering/ports/order-events.js";

export interface SseOrderEventMessage {
  readonly data: OrderEvent;
}

@Injectable()
export class OrderEventsService {
  private readonly events = new Subject<OrderEvent>();

  publish(event: OrderEvent): void {
    this.events.next(event);
  }

  eventsForOrder(orderId: string): Observable<SseOrderEventMessage> {
    return this.events.asObservable().pipe(
      filter((event) => event.orderId === orderId),
      map((event) => ({ data: event })),
    );
  }
}
