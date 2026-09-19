import { Injectable } from "@nestjs/common";
import { map, Observable, Subject } from "rxjs";
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

  eventsStream(): Observable<SseOrderEventMessage> {
    return this.events.asObservable().pipe(map((event) => ({ data: event })));
  }
}
