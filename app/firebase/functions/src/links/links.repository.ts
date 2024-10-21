import { RefMeta } from '../@shared/types/types.parser';
import { DBInstance } from '../db/instance';
import { BaseRepository } from '../db/repo.base';
import { decodeId, encodeId } from '../users/users.utils';

export class LinksRepository extends BaseRepository<RefMeta, RefMeta> {
  constructor(protected db: DBInstance) {
    super(db.collections.links, db, {
      decode: decodeId,
      encode: encodeId,
    });
  }
}
