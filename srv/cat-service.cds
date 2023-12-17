using be.wl.attachment as db from '../db/data-model';


service CatalogService {

    entity Books       as projection on db.Books;
    entity Attachments as projection on db.Attachments;

}
