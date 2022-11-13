import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { hash } from 'rsvp';
import { query, filter, limit } from '../../../utils/query';

export default class BasePlayRoute extends Route {
  @service
  store;

  @service
  router;

  async model() {
    const { gameSessions } = this.modelFor('authenticated.base');
    const gameSession = gameSessions.firstObject;

    const playerSessions = await this.store.query('tepache-player-session', {
      query() {
        return query(filter('gameSessionUrn', '==', gameSession.urn), limit(1));
      },
    });

    let playerSession = playerSessions.firstObject;

    if (!gameSession) {
      return this.router.transitionTo('authenticated.base');
    }

    if (!playerSession) {
      playerSession = this.store.createRecord('tepache-player-session', {
        gameSessionUrn: gameSession.urn,
      });
    }

    return hash({
      playerSession,
      gameSession,
    });
  }
}
