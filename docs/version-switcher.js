(() => {
    const script = document.currentScript;

    if (!script) {
        return;
    }

    const currentVersion = script.dataset.docsVersion;
    const manifestUrl = new URL('versions.json', script.src);

    function createGroup(label) {
        const group = document.createElement('optgroup');
        group.label = label;
        return group;
    }

    fetch(manifestUrl, { cache: 'no-store' })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Cannot load documentation versions: ${response.status}`);
            }

            return response.json();
        })
        .then((manifest) => {
            const container = document.createElement('div');
            const label = document.createElement('label');
            const labelText = document.createElement('span');
            const select = document.createElement('select');
            const groups = {
                prerelease: createGroup('Pre-releases'),
                stable: createGroup('Stable'),
            };

            container.className = 'account-sdk-version-switcher';
            labelText.textContent = 'Version';
            label.append(labelText, select);
            container.append(label);

            for (const version of manifest.versions) {
                const option = document.createElement('option');
                const isLatest = version.version === manifest.latestVersion;

                option.value = version.path;
                option.textContent = `${version.label}${isLatest ? ' (latest)' : ''}`;
                option.selected = version.version === currentVersion;

                const group = version.prerelease ? groups.prerelease : groups.stable;
                group.append(option);
            }

            for (const group of [groups.prerelease, groups.stable]) {
                if (group.children.length > 0) {
                    select.append(group);
                }
            }

            const allVersionsOption = document.createElement('option');
            allVersionsOption.value = '__all_versions__';
            allVersionsOption.textContent = 'All versions…';
            select.append(allVersionsOption);

            select.addEventListener('change', () => {
                const target =
                    select.value === '__all_versions__' ? 'versions.html' : `${select.value}/`;
                window.location.assign(new URL(target, manifestUrl));
            });

            const navigation = document.querySelector('.site-menu, body > nav');

            if (navigation) {
                navigation.prepend(container);
            } else {
                container.classList.add('account-sdk-version-switcher--floating');
                document.body.append(container);
            }
        })
        .catch((error) => console.error(error));
})();
