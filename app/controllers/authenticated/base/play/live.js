import Controller from '@ember/controller';
import { service } from '@ember/service';

export default class AuthenticatedBasePlayLiveController extends Controller {
  @service
  remoteConfig;
}
