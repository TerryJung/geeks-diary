import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { combineReducers, Store, StoreModule } from '@ngrx/store';
import { UiModule } from '../ui/ui.module';
import { BaseVcsItemFactory, VCS_ITEM_MAKING_FACTORIES, VcsItem, VcsItemListManager, VcsViewModule } from './vcs-view';
import { createDummies, createFakeEvent, fastTestSetup } from '../../../test/helpers';
import { VcsFileChange } from '../../core/vcs';
import { CheckboxComponent } from '../ui/checkbox';
import { VcsFileChangeDummy } from './dummies';
import { UpdateFileChangesAction } from './vcs.actions';
import { vcsReducerMap } from './vcs.reducer';
import { VcsStateWithRoot } from './vcs.state';
import { VcsManagerComponent } from './vcs-manager.component';


describe('browser.vcs.VcsManagerComponent', () => {
    let fixture: ComponentFixture<VcsManagerComponent>;
    let component: VcsManagerComponent;

    let listManager: VcsItemListManager;
    let store: Store<VcsStateWithRoot>;

    const fileChangeDummy = new VcsFileChangeDummy();

    const getAllSelectCheckbox = (): CheckboxComponent =>
        fixture.debugElement.query(
            By.css('.VcsManager__actionbar > gd-checkbox'),
        ).componentInstance as CheckboxComponent;

    function initVcsItemsWith(
        fileChanges: VcsFileChange[] = createDummies(fileChangeDummy, 5),
    ): VcsFileChange[] {
        store.dispatch(new UpdateFileChangesAction({ fileChanges }));
        fixture.detectChanges();

        // On next tick.
        flush();
        fixture.detectChanges();

        return fileChanges;
    }

    fastTestSetup();

    beforeAll(async () => {
        await TestBed
            .configureTestingModule({
                imports: [
                    UiModule,
                    VcsViewModule,
                    StoreModule.forRoot({
                        vcs: combineReducers(vcsReducerMap),
                    }),
                ],
                providers: [
                    {
                        provide: VCS_ITEM_MAKING_FACTORIES,
                        useFactory(baseVcsItemFactory: BaseVcsItemFactory) {
                            return [baseVcsItemFactory];
                        },
                        deps: [BaseVcsItemFactory],
                    },
                ],
                declarations: [
                    VcsManagerComponent,
                ],
            })
            .compileComponents();
    });

    beforeEach(() => {
        listManager = TestBed.get(VcsItemListManager);
        store = TestBed.get(Store);

        fixture = TestBed.createComponent(VcsManagerComponent);
        component = fixture.componentInstance;
    });

    describe('ngOnInit', () => {
        it('should initialize vcs item list whenever file changes are updated.', () => {
            fixture.detectChanges();

            spyOn(listManager, 'initWithFileChanges').and.callThrough();

            const beforeFileChanges = createDummies(fileChangeDummy, 5);
            store.dispatch(new UpdateFileChangesAction({ fileChanges: beforeFileChanges }));
            fixture.detectChanges();

            expect(listManager.initWithFileChanges).toHaveBeenCalledWith(beforeFileChanges);

            const afterFileChanges = createDummies(fileChangeDummy, 7);
            store.dispatch(new UpdateFileChangesAction({ fileChanges: afterFileChanges }));
            fixture.detectChanges();

            expect(listManager.initWithFileChanges).toHaveBeenCalledWith(afterFileChanges);
        });
    });

    describe('ngAfterViewInit', () => {
        it('should initialize vcs item list at first time.', fakeAsync(() => {
            const fileChanges = createDummies(fileChangeDummy, 10);
            store.dispatch(new UpdateFileChangesAction({ fileChanges }));

            spyOn(listManager, 'setViewContainerRef').and.callThrough();
            spyOn(listManager, 'setContainerElement').and.callThrough();
            spyOn(listManager, 'initWithFileChanges').and.callThrough();

            fixture.detectChanges();

            expect(listManager.setViewContainerRef).toHaveBeenCalledWith(component._viewContainerRef);
            expect(listManager.setContainerElement).toHaveBeenCalledWith(component._itemList.nativeElement);
            expect(listManager.initWithFileChanges).not.toHaveBeenCalled();

            flush();

            expect(listManager.initWithFileChanges).toHaveBeenCalledWith(fileChanges);
        }));
    });

    describe('Changes Tab - empty state', () => {
        it('should display empty state when vcs items in list are empty.', fakeAsync(() => {
            initVcsItemsWith([]);
            expect(fixture.debugElement.query(By.css('.VcsManager__itemListEmptyState'))).not.toBeNull();
        }));
    });

    describe('Changes Tab - actionbar selection toggle', () => {
        it('should all select checkbox is disabled when file changes are empty.', fakeAsync(() => {
            initVcsItemsWith([]);
            expect(component.allSelectCheckboxFormControl.disabled).toBe(true);
        }));

        it('should all select checkbox indeterminate when '
            + 'not all items selected or deselected.', fakeAsync(() => {
            initVcsItemsWith();

            // empty selection
            listManager._selectedItems.clear();
            fixture.detectChanges();
            expect(getAllSelectCheckbox().indeterminate).toBe(false);

            // indeterminate
            // const samples = sampleSize<VcsItemRef<any>>(listManager._itemRefs, 3);
            (listManager._itemRefs[0].componentInstance as VcsItem).select(true);
            (listManager._itemRefs[2].componentInstance as VcsItem).select(true);
            fixture.detectChanges();

            expect(getAllSelectCheckbox().indeterminate).toBe(true);

            // all selected.
            listManager._itemRefs.forEach(ref => (ref.componentInstance as VcsItem).select(true));
            fixture.detectChanges();

            expect(getAllSelectCheckbox().indeterminate).toBe(false);
        }));

        it('should select all items when toggles all select checkbox values to \'true\'.', fakeAsync(() => {
            initVcsItemsWith();

            // empty -> all selected
            listManager._itemRefs.forEach(ref => (ref.componentInstance as VcsItem).deselect(true));
            fixture.detectChanges();

            getAllSelectCheckbox()._onInputClick(createFakeEvent('click'));
            fixture.detectChanges();

            expect(component.allSelectCheckboxFormControl.value as boolean).toBe(true);
            expect(listManager.areAllItemsSelected()).toBe(true);
        }));

        it('should deselect all items when toggles all select checkbox if all items are selected.', fakeAsync(() => {
            initVcsItemsWith();

            // select all items.
            listManager._itemRefs.forEach(ref => (ref.componentInstance as VcsItem).select(true));
            fixture.detectChanges();

            getAllSelectCheckbox()._onInputClick(createFakeEvent('click'));
            fixture.detectChanges();

            expect(component.allSelectCheckboxFormControl.value as boolean).toBe(false);
            expect(listManager.isEmptySelection()).toBe(true);
        }));
    });
});