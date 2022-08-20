import Route from '@ember/routing/route';
import { service } from '@ember/service';
import {
  limit,
  orderBy,
  query,
  where,
} from 'ember-cloud-firestore-adapter/firebase/firestore';
import { hash } from 'rsvp';

export default class MagwestLiveRoute extends Route {
  @service
  remoteConfig;

  @service
  store;

  @service
  router;

  async model() {
    let { gameSession } = this.modelFor('authenticated.base') || {};

    if (!gameSession) {
      // Look for any game sessions running for the selected game
      // Status does not matter here
      const magWestGameUrn = this.remoteConfig.getString('magwest_game_urn');

      if (magWestGameUrn) {
        const gameSessions = await this.store.query('tepache-game-session', {
          isRealtime: true,

          filter(reference) {
            return query(
              reference,
              where('gameUrn', '==', magWestGameUrn),
              where('expiresAt', '>', new Date()),
              orderBy('expiresAt', 'desc')
            );
          },
        });

        gameSession = gameSessions.firstObject;
      } else {
        return this.router.transitionTo('authenticated.base');
      }
    }

    if (!gameSession) {
      return this.router.transitionTo('authenticated.base');
    }

    const playerSessions = await this.store.query('tepache-player-session', {
      gameSessionUrn: gameSession.urn,
    });

    const playerSession = playerSessions.firstObject;

    if (!playerSession) {
      return this.router.transitionTo('authenticated.base.magwest');
    }

    const today = new Date();
    const lastHour = new Date(today.getTime() - 1000 * 60);

    const hardwareInput = await this.store.query('tepache-hardware-input', {
      isRealtime: true,

      queryId: 'hardware-inputs',
      
      filter(reference) {
        return query(
          reference,
          where('gameSessionUrn', '==', gameSession.urn),
          where('createdAt', '>', lastHour),
          orderBy('createdAt', 'desc'),
          limit(4)
        );
      },
    });

    const log = await this.store.query('tepache-log', {
      isRealtime: true,

      filter(reference) {
        return query(
          reference,
          where('createdAt', '>', lastHour),
          orderBy('createdAt', 'desc'),
          limit(6)
        );
      },
    });

    return hash({
      playerSession,
      gameSession,
      hardwareInput,
      log,
    });
  }
}
