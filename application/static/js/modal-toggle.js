    function toggleModal(id) {
        const el = document.getElementById(id);
        if (el.style.display === 'flex') {
            console.log("closing modal with id:", id);
            closeModal(id);
        } else {
            console.log("opening modal with id:", id);
            openModal(id);
        }
    }
    function closeModal(id) {
        const el = document.getElementById(id);
        el.style.display = 'none';
    }
    function openModal(id) {
        const modals = ['help', 'modal-finish-user', 'modal-finish-guest', 'modal'];
        modals.forEach(mid => {
            const modalEl = document.getElementById(mid);
            if (modalEl) modalEl.style.display = 'none';
        });
        const el = document.getElementById(id);
        el.style.display = 'flex';
    }