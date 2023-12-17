import MessageBox from "sap/m/MessageBox";
import BaseController from "./BaseController";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Context from "sap/ui/model/odata/v4/Context";
import UploadSetItem from "sap/m/upload/UploadSetItem";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import UploadSet from "sap/m/upload/UploadSet";

/**
 * @namespace be.wl.attachment.demoapp.controller
 */
export default class Main extends BaseController {
	private bookContext: Context;
	private attachBinding: ODataListBinding;
	private filesToBeUploaded: number;
	private filesUploadFinished:number;
	public onInit(): void {

		const messageManager = sap.ui.getCore().getMessageManager();
		this.getView().setModel(messageManager.getMessageModel(), "message");
		this.getRouter().getRoute("main").attachPatternMatched((event: Route$PatternMatchedEvent) => this.onRouteMatched(event), this);
	}
	public async onRouteMatched(event: Route$PatternMatchedEvent) {
		this.bookContext = (this.getModel() as ODataModel).bindList("/Books", null, [], [], { $$groupId: "bookcreate" }).create();
		this.getView().setBindingContext(this.bookContext);

		this.attachBinding = (this.getModel() as ODataModel).bindList("/Attachments", null, [], [], { $$getKeepAliveContext: true });
	}

	public async onSave(event: Event) {
		//Submit input fields to backend
		await (this.getModel() as ODataModel).submitBatch("bookcreate");
		//When successful, ID will be filled with the created ID from the backend
		const id = this.bookContext.getProperty("ID");
		if (id) {
			//Submit Successful
			const uploader = (this.byId("UploadSet") as UploadSet);
			this.filesUploadFinished = 0;
			this.filesToBeUploaded = uploader.getIncompleteItems().length;
			//Get all not uploaded files and create an entity for each attachment
			Promise.all(uploader.getIncompleteItems().map(
				(item: UploadSetItem) =>
					this.createAttachmentEntry(id, item)
			)).then(() => {
				//Once all have an entity in the backend, we can start the upload. This needs to be in the "then" because we still need to trigger a submitBatch for creating the attachment entities 
				uploader.upload();
			});
			//trigger a submitBatch for creating the attachment entities 
			await (this.getModel() as ODataModel).submitBatch("bookcreate");
			//In case no attachments are uploaded => successful
			if (this.filesToBeUploaded === 0) {
				this.bookCreatedSuccessful();
			}
		}
	}
	public async createAttachmentEntry(id: string, file: UploadSetItem) {
		//Creates an attachment entity for each
		const attaContext = this.attachBinding.create({
			book_ID: id,
			fileName: file.getFileName()
		});
		//Will wait till it is being created, this will happen as soon as a new SubmitBatch is triggered
		await attaContext.created();
		//Once created, we have the ID and use it to set the correct upload url
		const attaResult = attaContext.getObject() as { ID: string };
		// Upload url will be different in the deployad version. The upload url always needs to be the full path
		let baseUrl = sap.ui.require.toUrl("be/wl/attachment/demoapp");
		if (window.location.hostname === "localhost") { 
			baseUrl = ""; // for local testing
		}
		file.setUploadUrl(`${baseUrl}/odata/v4/catalog/Attachments(${attaResult.ID})/content`);
		return attaResult;
	}
	public onUploadCompleted(event: Event) {
		this.bookCreatedSuccessful();
	}
	public async bookCreatedSuccessful() {
		this.filesUploadFinished++;
		if (this.filesToBeUploaded === this.filesUploadFinished) {
			MessageBox.success(`Book created: ${this.bookContext.getProperty("ID")}`);
			this.getModel().refresh();
		}
	}
}
