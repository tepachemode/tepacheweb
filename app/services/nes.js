import Service from '@ember/service';
import config from 'tepacheweb/config/environment';
import { Client } from '@hapi/nes/lib/client';
import { assert } from '@ember/debug';
import { service } from '@ember/service';

const RECONNECT_TIME = 1000 * 30; // 30 seconds

export default class NesService extends Service {
  @service
  session;

  #client;

  #connectionRequest;

  #callbacks = {};

  #unsubscribe;

  constructor() {
    super(...arguments);
    const host = config['hapi-nes'].host;

    assert('hapi-nes host is required', host);

    this.#callbacks.onConnect = [];
    this.#callbacks.onDisconnect = [];
    this.#callbacks.onHeartbeatTimeout = [];
    this.#callbacks.onError = [];

    this.#client = new Client(host, {
      timeout: 4000,
    });

    this.connect();

    this.#client.onConnect = () => {
      this.#callbacks.onConnect.forEach((callback) => callback());
    };

    this.#client.onDisconnect = (willReconnect, log) => {
      this.#callbacks.onDisconnect.forEach((callback) =>
        callback(willReconnect, log)
      );
    };

    this.#client.onHeartbeatTimeout = (willReconnect) => {
      this.#callbacks.onHeartbeatTimeout.forEach((callback) =>
        callback(willReconnect)
      );
    };

    this.#client.onError = (err) => {
      this.#callbacks.onError.forEach((callback) => callback(err));
    };
  }

  async request(path, payload) {
    await this.#connectionRequest;
    return await this.#client.request(path, payload);
  }

  get connected() {
    return this.#client.id;
  }

  connect() {
    clearInterval(this.#unsubscribe);

    this.#connectionRequest = this.#client.connect({
      auth: {
        headers: {
          authorization: `Basic ${this.session?.data?.authenticated?.user?.accessToken}`,
        },
      },
      reconnect: true,
      delay: 1000,
      retries: 1000,
      maxDelay: RECONNECT_TIME,
    });

    this.#unsubscribe = setInterval(() => {
      if (!this.#client.id) {
        this.#connectionRequest = this.#client.connect({
          auth: {
            headers: {
              authorization: `Basic ${this.session?.data?.authenticated?.user?.accessToken}`,
            },
          },
          reconnect: true,
          delay: 1000,
          maxDelay: RECONNECT_TIME,
        });
      }
    }, RECONNECT_TIME);
  }

  onConnect(callback) {
    this.#callbacks.onConnect.push(callback);
    return () => {
      this.#callbacks.onConnect.forEach((cb, index) => {
        if (cb === callback) {
          this.#callbacks.onConnect.splice(index, 1);
        }
      });
    };
  }

  onDisconnect(callback) {
    this.#callbacks.onDisconnect.push(callback);
    return () => {
      this.#callbacks.onDisconnect.forEach((cb, index) => {
        if (cb === callback) {
          this.#callbacks.onDisconnect.splice(index, 1);
        }
      });
    };
  }

  onHeartbeatTimeout(callback) {
    this.#callbacks.onHeartbeatTimeout.push(callback);
    return () => {
      this.#callbacks.onHeartbeatTimeout.forEach((cb, index) => {
        if (cb === callback) {
          this.#callbacks.onHeartbeatTimeout.splice(index, 1);
        }
      });
    };
  }

  onError(callback) {
    this.#callbacks.onError.push(callback);
    return () => {
      this.#callbacks.onError.forEach((cb, index) => {
        if (cb === callback) {
          this.#callbacks.onError.splice(index, 1);
        }
      });
    };
  }

  willDestroy() {
    clearInterval(this.#unsubscribe);
  }
}
