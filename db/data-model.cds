namespace be.wl.attachment;

using {
  cuid,
  managed
} from '@sap/cds/common';

entity Books : cuid {
      title       : String;
      stock       : Integer;
      Attachments : Composition of many Attachments
                      on Attachments.book = $self;
}


entity Attachments : cuid, managed {
  book      : Association to Books;
  content   : LargeBinary  @Core.MediaType: mediaType  @Core.ContentDisposition.Filename: fileName  @Core.ContentDisposition.Type: 'inline';
  mediaType : String       @Core.IsMediaType;
  fileName  : String;
}
