const ProductPreorderSettings = ({ product, onUpdate }) => {
  const [allowPreorder, setAllowPreorder] = useState(product.allowPreorder || false);
  const [preorderStock, setPreorderStock] = useState(product.preorderStock || 0);
  const [estimatedShipDate, setEstimatedShipDate] = useState(product.estimatedShipDate ? product.estimatedShipDate.slice(0,10) : '');
  const [preorderMessage, setPreorderMessage] = useState(product.preorderMessage || '');

  const handleSave = async () => {
    await API.put(`/products/${product._id}/preorder`, {
      allowPreorder,
      preorderStock,
      estimatedShipDate: estimatedShipDate ? new Date(estimatedShipDate) : null,
      preorderMessage,
    });
    onUpdate();
  };

  return ( ... form fields ... );
};