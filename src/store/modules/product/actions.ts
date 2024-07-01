import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import logger from "@/logger";
import { ProductService } from "@/services/ProductService"
import { hasError, showToast } from '@/utils';
import emitter from '@/event-bus';
import { translate } from '@/i18n';

const actions: ActionTree<ProductState, RootState> = {

  async fetchProducts ( { commit, state }, { productIds }) {
    const cachedProductIds = Object.keys(state.cached);
    const remainingProductIds = productIds.filter((productId: any) => !cachedProductIds.includes(productId))

    const productIdFilter = remainingProductIds.join(' OR ')

    // If there are no products skip the API call
    if (productIdFilter === '') return;

    const resp = await ProductService.fetchProducts({
      "filters": ['productId: (' + productIdFilter + ')'],
      "viewSize": productIds.length
    })
    if (resp.status === 200 && !hasError(resp)) {
      const products = resp.data.response.docs;
      // Handled empty response in case of failed query
      if (resp.data) commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products });
    }
    // TODO Handle specific error
    return resp;
  },

  async currentProduct ({ commit }, payload) {
    commit(types.PRODUCT_CURRENT_UPDATED, payload)
  },

  async findProduct({ commit, state }, payload) {
    let resp;
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    try {
      resp = await ProductService.fetchProducts({
        "filters": ['isVirtual: false'],
        "viewSize": payload.viewSize,
        "viewIndex": payload.viewIndex,
        "keyword":  payload.queryString
      })
      if (resp.status === 200 && resp.data.response?.docs.length > 0 && !hasError(resp)) {
        let products = resp.data.response.docs;
        const total = resp.data.response.numFound;

        if (payload.viewIndex && payload.viewIndex > 0) products = state.list.items.concat(products)
        commit(types.PRODUCT_LIST_UPDATED, { products, total });
        commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products });
      }
    } catch (error) {
      showToast(translate("Something went wrong"));
    }
    if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    
    return resp;
  },
}

export default actions;
