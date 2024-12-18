<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/tabs/count" slot="start"></ion-back-button>
        <ion-title>{{ cycleCount.countImportName }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="find">
        <aside class="filters">
          <div class="fixed-section">
            <ion-item lines="full">
              <ion-input :label="translate('Scan items')" :placeholder="translate('Scan or search products')" ref="barcodeInput" @ionFocus="selectSearchBarText($event)" v-model="queryString" @keyup.enter="scanProduct()"/>
            </ion-item>
            <ion-segment v-model="selectedSegment" @ionChange="handleSegmentChange()">
              <template v-if="cycleCount?.statusId === 'INV_COUNT_ASSIGNED'">
                <ion-segment-button value="all">
                  <ion-label>{{ translate("ALL") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="unmatched">
                  <ion-label>{{ translate("UNMATCHED") }}</ion-label>
                </ion-segment-button>
              </template>
  
              <template v-else-if="cycleCount?.statusId === 'INV_COUNT_REVIEW'">
                <ion-segment-button value="all">
                  <ion-label>{{ translate("ALL") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="notCounted">
                  <ion-label>{{ translate("NOT COUNTED") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="counted">
                  <ion-label>{{ translate("COUNTED") }}</ion-label>
                </ion-segment-button>
              </template>
  
              <template v-else-if="cycleCount?.statusId === 'INV_COUNT_COMPLETED' && 'INV_COUNT_REJECTED'">
                <ion-segment-button value="all">
                  <ion-label>{{ translate("ALL") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="rejected">
                  <ion-label>{{ translate("REJECTED") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="accepted">
                  <ion-label>{{ translate("ACCEPTED") }}</ion-label>
                </ion-segment-button>
              </template> 
            </ion-segment>
          </div>
          <template v-if="itemsList?.length > 0">
            <ProductItemList v-for="item in itemsList" :key="item.inventoryCountImportId" :item="item"/>
          </template>
          <template v-else>
            <div class="empty-state">
              <p>{{ translate("No products found.") }}</p>
            </div>
          </template>
        </aside>
        <!--Product details-->
        <main :class="itemsList?.length ? 'product-detail' : ''">
          <template v-if="itemsList?.length">
            <div class="product" @scroll="onScroll">
              <div class="image ion-padding-top" v-for="item in itemsList" :key="item.importItemSeqId" :data-product-id="item.productId" :data-seq="item.importItemSeqId" :id="item.scannedId ? item.scannedId : `${item.productId}-${item.importItemSeqId}`" :data-isMatching="item.isMatching" :data-scanned-id="item.scannedId">
                <Image :src="getProduct(item.productId)?.mainImageUrl" />
              </div>
            </div>
            <div class="detail">
              <ion-item lines="none">
                <ion-label class="ion-text-wrap" v-if="currentProduct.scannedId">
                  <h1>{{ currentProduct.scannedId }}</h1>
                </ion-label>
                <ion-label class="ion-text-wrap" v-else>
                  <h1>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].primaryId, getProduct(currentProduct.productId)) || getProduct(currentProduct.productId).productName }}</h1>
                  <p>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].secondaryId, getProduct(currentProduct.productId)) }}</p>
                </ion-label>

                <ion-badge v-if="currentProduct.itemStatusId === 'INV_COUNT_COMPLETED'" color="success">
                  {{ translate("accepted") }}
                </ion-badge>

                <ion-badge v-if="currentProduct.itemStatusId === 'INV_COUNT_REJECTED'" color="danger">
                  {{ translate("rejected") }}
                </ion-badge>

                <ion-item lines="none" v-if="itemsList?.length">
                  <ion-label>{{ `${currentItemIndex + 1}/${itemsList.length}` }}</ion-label>
                </ion-item>

                <ion-button @click="changeProduct('previous')" :disabled="currentItemIndex === 0" fill="outline" shape="round" color="medium" class="ion-no-padding">
                  <ion-icon slot="icon-only" :icon="chevronUpOutline"></ion-icon>
                </ion-button>

                <ion-button @click="changeProduct('next')" :disabled="currentItemIndex === itemsList.length - 1" fill="outline" shape="round" color="medium" class="ion-no-padding">
                  <ion-icon slot="icon-only" :icon="chevronDownOutline"></ion-icon>
                </ion-button>
              </ion-item>
              <ion-list v-if="!currentProduct.scannedId && currentProduct.statusId !== 'INV_COUNT_CREATED' && currentProduct.statusId !== 'INV_COUNT_ASSIGNED'">
                <ion-item>
                  {{ translate("Counted") }}
                <ion-label slot="end">{{ currentProduct.quantity || currentProduct.quantity === 0 ? currentProduct.quantity : '-'}}</ion-label>
                </ion-item>
                <template v-if="productStoreSettings['showQoh']">
                  <ion-item>
                    {{ translate("Current on hand") }}
                    <ion-label slot="end">{{ currentProduct.qoh }}</ion-label>
                  </ion-item>
                  <ion-item v-if="currentProduct.itemStatusId !== 'INV_COUNT_REJECTED'">
                    {{ translate("Variance") }}
                    <ion-label slot="end">{{ getVariance(currentProduct, false) }}</ion-label>
                  </ion-item>
                </template>
              </ion-list>
              <template v-else>
                <ion-list v-if="currentProduct.isRecounting">
                  <ion-item>
                    <ion-input :label="translate('Count')" :disabled="productStoreSettings['forceScan']" :placeholder="translate('submit physical count')" name="value" v-model="inputCount" id="value" type="number" min="0" required @ionInput="hasUnsavedChanges=true" @keydown="inputCountValidation"/>
                    <ion-button slot="end" fill="clear" size="default" class="ion-no-padding" @click="inputCount = 0">
                      <ion-icon :icon="closeOutline" stot="icon-only" />
                    </ion-button>
                  </ion-item>

                  <template v-if="productStoreSettings['showQoh']">
                    <ion-item>
                      {{ translate("Current on hand") }}
                      <ion-label slot="end">{{ currentProduct.qoh }}</ion-label>
                    </ion-item>
                    <ion-item>
                      {{ translate("Variance") }}
                      <ion-label slot="end">{{ getVariance(currentProduct, true) }}</ion-label>
                    </ion-item>
                  </template>
                  <div class="ion-margin">
                    <ion-button color="medium" fill="outline" @click="discardRecount()">
                      {{ translate("Discard re-count") }}
                    </ion-button>
                    <ion-button fill="outline" @click="openRecountSaveAlert()">
                      {{ translate("Save new count") }}
                    </ion-button>
                  </div>
                </ion-list>

                <ion-list v-else-if="currentProduct.quantity >= 0">
                  <ion-item>
                    {{ translate("Counted") }}
                    <ion-label slot="end">{{ currentProduct.quantity }}</ion-label>
                  </ion-item>
                  <ion-item>
                    {{ translate("Counted by") }}
                    <ion-label slot="end">{{ getPartyName(currentProduct)}}</ion-label>
                  </ion-item>
                  <!-- TODO: make the counted at information dynamic -->
                  <!-- <ion-item>
                    {{ translate("Counted at") }}
                    <ion-label slot="end">{{ "-" }}</ion-label>
                  </ion-item> -->
                  <template v-if="productStoreSettings['showQoh']">
                    <ion-item>
                      {{ translate("Current on hand") }}
                      <ion-label slot="end">{{ currentProduct.qoh }}</ion-label>
                    </ion-item>
                    <ion-item v-if="currentProduct.itemStatusId !== 'INV_COUNT_REJECTED'">
                      {{ translate("Variance") }}
                      <ion-label slot="end">{{ getVariance(currentProduct, false) }}</ion-label>
                    </ion-item>
                  </template>
                  <ion-button v-if="!['INV_COUNT_REJECTED', 'INV_COUNT_COMPLETED'].includes(currentProduct.itemStatusId)" class="ion-margin" fill="outline" expand="block" @click="openRecountAlert()">
                    {{ translate("Re-count") }}
                  </ion-button>
                </ion-list>

                <ion-list v-else>
                  <ion-item v-if="currentProduct.itemStatusId === 'INV_COUNT_REJECTED' || currentProduct.itemStatusId === 'INV_COUNT_COMPLETED'">
                    {{ translate("Counted") }}
                    <ion-label slot="end">{{ currentProduct.quantity || "-" }}</ion-label>
                  </ion-item>
                  <ion-item v-else>
                    <ion-input :label="translate('Count')" :placeholder="translate('submit physical count')" :disabled="productStoreSettings['forceScan']" name="value" v-model="inputCount" id="value" type="number" min="0" required @ionInput="hasUnsavedChanges=true" @keydown="inputCountValidation"/>
                    <ion-button slot="end" fill="clear" size="default" class="ion-no-padding" @click="inputCount = 0">
                      <ion-icon :icon="closeOutline" stot="icon-only" />
                    </ion-button>
                  </ion-item>

                  <template v-if="productStoreSettings['showQoh']">
                    <ion-item>
                      {{ translate("Current on hand") }}
                      <ion-label slot="end">{{ currentProduct.qoh }}</ion-label>
                    </ion-item>
                    <ion-item>
                      {{ translate("Variance") }}
                      <ion-label slot="end">{{ getVariance(currentProduct, true) }}</ion-label>
                    </ion-item>
                  </template>
                  <ion-button v-if="!['INV_COUNT_REJECTED', 'INV_COUNT_COMPLETED'].includes(currentProduct.itemStatusId)" class="ion-margin" expand="block" @click="saveCount(currentProduct)">
                    {{ translate("Save count") }}
                  </ion-button>
                </ion-list>
              </template>
            </div>
          </template>
          <template v-else>
            <div class="empty-state">
              <p>{{ translate("No products found.") }}</p>
            </div>
          </template>
        </main>
      </div>
    </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed" v-if="cycleCount?.statusId === 'INV_COUNT_ASSIGNED'">
      <ion-fab-button @click="readyForReview">
        <ion-icon :icon="paperPlaneOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script lang="ts" setup>
import {
  IonBackButton,
  IonContent,
  IonBadge, 
  IonButton, 
  IonIcon,
  IonItem,  
  IonList,
  IonHeader,
  IonFab,
  IonFabButton,
  IonInput,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewDidEnter,
  onIonViewDidLeave,
  alertController
} from "@ionic/vue";
import { chevronDownOutline, chevronUpOutline, closeOutline, paperPlaneOutline } from "ionicons/icons";
import { translate } from "@/i18n";
import { computed, defineProps, ref } from "vue";
import { useStore } from "@/store";
import logger from "@/logger";
import emitter from "@/event-bus";
import ProductItemList from "@/views/ProductItemList.vue";
import { getPartyName, getProductIdentificationValue, hasError, showToast } from "@/utils";
import { CountService } from "@/services/CountService";
import Image from "@/components/Image.vue";
import router from "@/router";
import { onBeforeRouteLeave } from "vue-router";
import { ProductService } from "@/services/ProductService";

const store = useStore();

const currentProduct = computed(() => store.getters["product/getCurrentProduct"]);
const getProduct = computed(() => (id: any) => store.getters["product/getProduct"](id));
const cycleCountItems = computed(() => store.getters["count/getCycleCountItems"]);
const userProfile = computed(() => store.getters["user/getUserProfile"])
const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])
const currentItemIndex = computed(() => !currentProduct.value ? 0 : currentProduct.value.scannedId ? itemsList.value?.findIndex((item: any) => item.scannedId === currentProduct.value.scannedId) : itemsList?.value.findIndex((item: any) => item.productId === currentProduct.value?.productId && item.importItemSeqId === currentProduct.value?.importItemSeqId));

const itemsList = computed(() => {
  if(selectedSegment.value === "all") {
    return cycleCountItems.value.itemList;
  } else if(selectedSegment.value === "pending") {
    return cycleCountItems.value.itemList.filter((item: any) => item.isMatchNotFound);
  } else if(selectedSegment.value === "counted") {
    return cycleCountItems.value.itemList.filter((item: any) => item.quantity >= 0 || (item.itemStatusId === "INV_COUNT_REJECTED" || item.itemStatusId === "INV_COUNT_COMPLETED"));
  } else if(selectedSegment.value === "notCounted") {
    return cycleCountItems.value.itemList.filter((item: any) => !item.quantity && item.statusId === "INV_COUNT_REVIEW");
  } else if(selectedSegment.value === "rejected") {
    return cycleCountItems.value.itemList.filter((item: any) => item.itemStatusId === "INV_COUNT_REJECTED");
  } else if(selectedSegment.value === "accepted") {
    return cycleCountItems.value.itemList.filter((item: any) => item.itemStatusId === "INV_COUNT_COMPLETED");
  } else {
    return [];
  }
});

let previousItem = {} as any;
const props = defineProps(["id"]);
const barcodeInput = ref();
const cycleCount = ref({}) as any;
const queryString = ref("");
const selectedSegment = ref("all");
const inputCount = ref("") as any;
const isScrolling = ref(false);
const isScanningInProgress = ref(false);
const hasUnsavedChanges = ref(false) as any;

onIonViewDidEnter(async() => {  
  await Promise.allSettled([fetchCycleCount(),   await store.dispatch("count/fetchCycleCountItems", { inventoryCountImportId : props?.id })])
  previousItem = itemsList.value[0]
  await store.dispatch("product/currentProduct", itemsList.value?.length ? itemsList.value[0] : {})
  barcodeInput.value?.$el?.setFocus();
})

onIonViewDidLeave(async() => {
  await store.dispatch('count/updateCycleCountItems', []);
  store.dispatch("product/currentProduct", {});
})

onBeforeRouteLeave(async (to) => {
  if(to.path === "/login") return;
  if(!hasUnsavedChanges.value) return true;
  let leavePage = false;

  const alert = await alertController.create({
    header: translate("Leave page"),
    message: translate("Any edits made in the counted quantity on this page will be lost."),
    buttons: [
      {
        text: translate("STAY"),
        handler: () => {
          leavePage = false
        }
      },
      {
        text: translate("LEAVE"),
        handler: () => {
          leavePage = true
        },
      },
    ],
  });

  alert.present();
  const data = await alert.onDidDismiss()
  // If clicking backdrop just close the modal and do not redirect the user to previous page
  if(data?.role === "backdrop") {
    return false;
  }

  if(leavePage) hasUnsavedChanges.value = false;
  return leavePage
})

async function fetchCycleCount() {
  emitter.emit("presentLoader");
  try {
    const resp = await CountService.fetchCycleCount(props?.id)
    if(!hasError(resp)) {
      cycleCount.value = resp?.data
    } else {
      throw resp;
    }
  } catch (err) {
    logger.error(err)
    showToast(translate("Something went wrong"))
  }
  emitter.emit("dismissLoader")
}

async function scanProduct() {
  if(!queryString.value.trim()) {
    showToast(translate("Please provide a valid barcode identifier."))
    return;
  }

  const barcodeIdentifier = productStoreSettings.value["barcodeIdentificationPref"];
  let selectedItem = {} as any;

  if(cycleCount.value.statusId === 'INV_COUNT_ASSIGNED') {
    selectedItem = itemsList.value.find((item: any) => {
      const itemVal = barcodeIdentifier ? getProductIdentificationValue(barcodeIdentifier, getProduct.value(item.productId)) : item.internalName;
      return itemVal === queryString.value && item.itemStatusId === "INV_COUNT_CREATED";
    });
  }

  if(!selectedItem || !Object.keys(selectedItem).length) {
    selectedItem = itemsList.value.find((item: any) => {
      const itemVal = barcodeIdentifier ? getProductIdentificationValue(barcodeIdentifier, getProduct.value(item.productId)) : item.internalName;
      return itemVal === queryString.value;
    });
  }

  console.log(selectedItem);
  

  if(!selectedItem || selectedItem?.scannedId) {
    await checkForNewProducts()
    queryString.value = ""
    return;
  }

  const isAlreadySelected = currentProduct.value.scannedId ? (currentProduct.value.productId === selectedItem.productId && currentProduct.value.scannedId === selectedItem.scannedId) : (currentProduct.value.productId === selectedItem.productId && currentProduct.value.importItemSeqId === selectedItem.importItemSeqId);
  if(!isAlreadySelected) {
    hasUnsavedChanges.value = false;
    router.replace({ hash: selectedItem.scannedId ? `#${selectedItem.scannedId}` : `#${selectedItem.productId}-${selectedItem.importItemSeqId}` }); 
    setTimeout(() => {
      const element = document.getElementById(selectedItem.scannedId ? selectedItem.scannedId : `${selectedItem.productId}-${selectedItem.importItemSeqId}`);
      if(element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 0);
  } else if(selectedItem.itemStatusId === "INV_COUNT_CREATED") {
    if((!selectedItem.quantity && selectedItem.quantity !== 0) || currentProduct.value.isRecounting) {
      hasUnsavedChanges.value = true;
      inputCount.value++
    } else if(selectedItem.quantity >= 0 && selectedItem.itemStatusId !== "INV_COUNT_REJECTED" && selectedItem.itemStatusId !== "INV_COUNT_COMPLETED") {
      openRecountAlert()
    }
  }
  queryString.value = ""
}

async function checkForNewProducts() {
  let selectedItem = itemsList.value.find((item: any) => item.scannedId === queryString.value)
  console.log(selectedItem);
  

  if(!selectedItem) {
    const newItem = {
      scannedId: queryString.value,
      isMatching: true,
      scannedCount: "",
      itemStatusId: "INV_COUNT_CREATED"
    }

    await addItemToCycleCount(newItem);
    selectedItem = newItem;
  }

  const isAlreadySelected = currentProduct.value?.scannedId === selectedItem.scannedId;
  if(!isAlreadySelected) {
    if(itemsList.value.length === 1) {
      await store.dispatch("product/currentProduct", selectedItem)
      previousItem = selectedItem;
      return;
    }
    router.replace({ hash: `#${selectedItem.scannedId}` }); 
    setTimeout(() => {
      const element = document.getElementById(`${selectedItem.scannedId}`);
      if(element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 0);
  } else {
    inputCount.value++
  }
}

async function addItemToCycleCount(newItem: any) {
  const items = JSON.parse(JSON.stringify(cycleCountItems.value.itemList))
  items.push(newItem);
  await store.dispatch('count/updateCycleCountItems', items);
  findProductFromIdentifier(queryString.value);
}

async function findProductFromIdentifier(scannedValue: string) {
  const product = await store.dispatch("product/fetchProductByIdentification", { scannedValue })

  const items = JSON.parse(JSON.stringify(cycleCountItems.value.itemList));
  items.map((item: any) => {
    if(item.scannedId === scannedValue) {
      if(product) {
        item.productId = product.productId
      } else {
        item.isMatchNotFound = true  
      }
      item.isMatching = false;
    }
  })
  await store.dispatch('count/updateCycleCountItems', items);
  if(currentProduct.value.scannedId === scannedValue) {
    store.dispatch("product/currentProduct", product?.productId ? { ...currentProduct.value, isMatching: false, productId: scannedValue } : { ...currentProduct.value, isMatching: false, isMatchNotFound: true });
  }
}

function handleSegmentChange() {
  if(itemsList.value.length > 0) {
    let updatedProduct = Object.keys(currentProduct.value)?.length ? itemsList.value.find((item: any) => item.productId === currentProduct.value.productId && item.importItemSeqId === currentProduct.value.importItemSeqId) : itemsList.value[0]
    if(!updatedProduct) {
      updatedProduct = itemsList.value[0];
    }
    store.dispatch("product/currentProduct", updatedProduct);
  } else {
    store.dispatch("product/currentProduct", {});
  }
}

// This function observes the scroll event on the main element, creates an IntersectionObserver to track when products come into view, 
// and updates the current product state and navigation when a product intersects with the main element.
const onScroll = (event: any) => {
  const main = event.target;
  const products = Array.from(main.querySelectorAll('.image'));

  const observer = new IntersectionObserver((entries) => {  
    entries.forEach((entry: any) => {
      if(entry.isIntersecting) {
        const dataset = entry.target.dataset
        let currentProduct = {} as any;

        if(dataset.ismatching || dataset.isMatchNotFound) {
          currentProduct = itemsList.value.find((item: any) => item.scannedId === dataset.scannedId);
        } else {
          currentProduct = itemsList.value?.find((item: any) => item.productId === dataset.productId && item.importItemSeqId === dataset.seq);
        }

        if(!isScanningInProgress.value && (previousItem.scannedId ? (previousItem.scannedId === currentProduct.scannedId) : (previousItem.productId !== currentProduct.productId || previousItem.importItemSeqId !== currentProduct.importItemSeqId))) {
          if(inputCount.value) saveCount(previousItem, true);
        }

        previousItem = currentProduct  // Update the previousItem variable with the current item

        if(currentProduct) {
          store.dispatch("product/currentProduct", currentProduct);
        }
      }
    });
  }, {
    root: main,
    threshold: 0.5, 
  });

  products.forEach((product: any) => {
    observer.observe(product);
  });
};

async function changeProduct(direction: string) {
  if(isScrolling.value) return;
  isScrolling.value = true;

  const index = (direction === 'next') ? currentItemIndex.value + 1 : currentItemIndex.value - 1;

  if(index >= 0 && index < itemsList.value.length) {
    const product = itemsList.value[index];
    let productEl = {} as any;
    if(product.scannedId) {
      productEl = document.getElementById(product.scannedId);
    } else {
      productEl = document.querySelector(`[data-seq="${product.importItemSeqId}"]`);
    }
    if(productEl) productEl.scrollIntoView({ behavior: 'smooth' });
    await new Promise(resolve => setTimeout(resolve, 500));
    await store.dispatch("product/currentProduct", product);
  }
  isScrolling.value = false;
}


function getVariance(item: any , isRecounting: boolean) {
  const qty = item.quantity
  if(isRecounting && inputCount.value === "") return 0;
  if(!isRecounting && !qty && qty !== 0) {
    return 0;
  }

  // As the item is rejected there is no meaning of displaying variance hence added check for REJECTED item status
  return item.itemStatusId === "INV_COUNT_REJECTED" ? 0 : parseInt(isRecounting ? inputCount.value : qty) - parseInt(item.qoh)
}

async function saveCount(product: any, isScrollEvent = false) {
  let currentProduct = product
  isScanningInProgress.value = true;
  if(!inputCount.value && inputCount.value !== 0) {
    showToast(translate(productStoreSettings.value['forceScan'] ? "Scan a count before saving changes" : "Enter a count before saving changes"))
    isScanningInProgress.value = false;
    return;
  }

  console.log(currentProduct);
  if(currentProduct.scannedId) {
    if(currentProduct.isMatching || currentProduct.isMatchNotFound) {
      const items = JSON.parse(JSON.stringify(cycleCountItems.value.itemList));
      items.map((item: any) => {
        if(item.scannedId === currentProduct.scannedId) {
          item.isMatching = false;
          item.isMatchNotFound = true  
        }
      })
      await store.dispatch('count/updateCycleCountItems', items);
      store.dispatch("product/currentProduct", { ...currentProduct.value, isMatching: false, isMatchNotFound: true });
    } else {
      const productId = currentProduct.productId
      await addProductToCount(productId); 
      currentProduct = itemsList.value.find((item: any) => item.productId === productId);
    }
  }

  try {
    const payload = {
      inventoryCountImportId: currentProduct.inventoryCountImportId,
      importItemSeqId: currentProduct.importItemSeqId,
      productId: currentProduct.productId,
      quantity: inputCount.value,
      countedByUserLoginId: userProfile.value.username
    };
    const resp = await CountService.updateCount(payload);
    if(!hasError(resp)) {
      currentProduct.quantity = inputCount.value
      currentProduct.countedByGroupName = userProfile.value.userFullName
      currentProduct.countedByUserLoginId = userProfile.value.username
      currentProduct.isRecounting = false;
      inputCount.value = ''; 
      const items = JSON.parse(JSON.stringify(cycleCountItems.value.itemList))
      items.map((item: any) => {
        if(item.importItemSeqId === currentProduct.importItemSeqId) {
          item.quantity = currentProduct.quantity
          item.countedByGroupName = userProfile.value.userFullName
          item.countedByUserLoginId = userProfile.value.username
        }
      })
      await store.dispatch('count/updateCycleCountItems', items);
      if(!isScrollEvent) await store.dispatch('product/currentProduct', currentProduct);
    } else {
      throw resp.data;
    }
    hasUnsavedChanges.value = false;
    handleSegmentChange();
  } catch (err) {
    logger.error(err);
    showToast(translate("Something went wrong, please try again"));
  }
  isScanningInProgress.value = false
}

async function addProductToCount(productId: any) {
  if(!productId) {
    showToast(translate("Failed to add product to count"))
    return;
  }

  try {
    const resp = await CountService.addProductToCount({
      inventoryCountImportId: cycleCount.value.inventoryCountImportId,
      itemList: [{
        idValue: productId,
        statusId: "INV_COUNT_CREATED"
      }]
    })

    if(!hasError(resp)) {
      await store.dispatch("count/fetchCycleCountItems", { inventoryCountImportId : props?.id })
    } else {
      throw resp;
    }
  } catch(err) {
    logger.error("Failed to add product to count", err)
    showToast(translate("Failed to add product to count"))
  }
}

async function openRecountAlert() {
  const alert = await alertController.create({
    header: translate("Update count"),
    message: translate("Updating a count will replace the existing count. The previous count cannot be restored after being replaced."),
    buttons: [{
      text: translate('Cancel'),
      role: 'cancel',
    },
    {
      text: translate('Re-count'),
      handler: () => {
        inputCount.value = currentProduct.value.quantity; 
        currentProduct.value.isRecounting = true;
      }
    }]
  });
  await alert.present();
  alert.onDidDismiss().then(() => {
    barcodeInput.value.$el.setFocus();
  })
}

async function openRecountSaveAlert() {
  if(!inputCount.value && inputCount.value !== 0) {
    showToast(translate(productStoreSettings.value['forceScan'] ? "Scan a count before saving changes" : "Enter a count before saving changes"));
    return;
  }

  const alert = await alertController.create({
    header: translate("Save re-count"),
    message: translate("Saving recount will replace the existing count for item."),
    buttons: [{
      text: translate('Cancel'),
      role: 'cancel',
    },
    {
      text: translate("Save Re-count"),
      handler: async () => {
        await saveCount(currentProduct.value); 
      }
    }]
  });
  await alert.present();
}

async function discardRecount() {
  const alert = await alertController.create({
    header: translate("Discard re-count"),
    message: translate("Discarding the re-count will revert the count to the previous count value."),
    buttons: [{
      text: translate("Cancel"),
      role: "cancel",
    },
    {
      text: translate("Discard"),
      handler: async () => {
        inputCount.value = ""; 
        currentProduct.value.isRecounting = false;
        hasUnsavedChanges.value = false;
      }
    }]
  });
  await alert.present();
}

async function readyForReview() {
  const alert = await alertController.create({
    header: translate("Submit for review"),
    message: translate("Make sure you've reviewed the products and their counts before uploading them for review."),
    buttons: [{
      text: translate("Cancel"),
      role: "cancel",
    },
    {
      text: translate("Submit"),
      handler: async () => {
        try {
          await CountService.updateCycleCount({
            inventoryCountImportId: props?.id,
            statusId: "INV_COUNT_REVIEW"
          })
          router.push("/tabs/count")
          showToast(translate("Count has been submitted for review"))
        } catch(err) {
          showToast(translate("Failed to submit cycle count for review"))
        }
      }
    }]
  });
  await alert.present();
}

function selectSearchBarText(event: any) {
  event.target.getInputElement().then((element: any) => {
    element.select();
  })
}

function inputCountValidation(event: any) {
  if(/[`!@#$%^&*()_+\-=\\|,.<>?~e]/.test(event.key) && event.key !== "Backspace") event.preventDefault();
}
</script>

<style scoped>

ion-list {
  min-width: 400px;
}

.find {
  display: grid;
  height: 100%;
  grid-template-areas: "search"
                       "main";
}

.find >.filters {
  display: none;
}

.find > main {
  grid-area: main;
}

.search {
  grid-area: search;
}

.filters {
  grid-area: filters;
  border-right: 1px solid var(--ion-color-medium);
}

.product-info {
  width: 100%;
  margin-top: var(--spacer-lg);
}

.product-image {
  text-align: center;
  margin-top: var(--spacer-lg);
}

.fixed-section {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--ion-background-color, #fff);
}

aside {
  overflow-y: scroll;
}

.product-detail {
  display: grid;
  grid: "product detail" / 1fr 2fr;
  height: 100%;
  overflow: auto;
}

.product {
  overflow: scroll;
  height: 90vh;
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;
}

.product::-webkit-scrollbar { 
  display: none;  
}

.image {
  grid-area: image;
  height: 100vh;
  scroll-snap-stop: always;
  scroll-snap-align: start;
}

.detail {
  grid-area: detail;
  margin-top: var(--spacer-lg);
  margin-right: var(--spacer-lg);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: max-content;
}

.detail > ion-item {
  grid-column: span 2;
}

@media (max-width: 991px) {
  .product {
    grid: "image"
          "detail"
          / auto;
    padding: 0;
  }
}

@media (min-width: 991px) {
 .find {
    grid: "search main" min-content
          "filters main" 1fr
          / 375px;
    column-gap: var(--spacer-2xl);
  }
 .find >.filters {
    display: unset;
  }
}

</style>